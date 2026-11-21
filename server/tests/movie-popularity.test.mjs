import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { isCountableMovieSearch } from '../dist/movie-popularity/policy.js';
import { createPopularityWorker } from '../dist/movie-popularity/worker.js';
import { dispatchSearchEvents, resolveSearchEvent, topSearchedMovies } from '../dist/movie-popularity/repository.js';
import { MovieSearchEvent, MovieSearchTotal } from '../dist/movie-popularity/models.js';
import { ChatTurn } from '../dist/ai/models/conversation.model.js';
import { BotUpdate } from '../dist/bot/models.js';

const movie = { title: 'The Last Witch Hunter', year: 2015, confidence: 'high', presentation: 'brief',
  titleUz: null, titleRu: null, sources: [{ title: 'Film', url: 'https://example.com/film' }], posters: [] };
test('successful identification counts, but failed guesses and metadata follow-ups do not', () => {
  assert.equal(isCountableMovieSearch(movie), true);
  assert.equal(isCountableMovieSearch({ ...movie, catalogId: 8036, sources: [] }), true);
  for(const presentation of ['details','cast','characters','trailer']) {
    assert.equal(isCountableMovieSearch({...movie,presentation},true),true);
    assert.equal(isCountableMovieSearch({...movie,presentation},false),false);
  }
  for (const candidate of [null, { ...movie, confidence: 'low' }, { ...movie, linksOnly: true },
    { ...movie, sources: [], catalogId: undefined }]) assert.equal(isCountableMovieSearch(candidate), false);
});

test('unpublished films wait for their catalogue ID; later searches resolve without more AI calls', async () => {
  let found = null;
  const event = { id: 'ui:one', identity: {}, catalogId: null, attempts: 0 };
  const writes = [], delayed = [];
  const worker = createPopularityWorker({ dispatch: async () => 0, pending: async () => [event], match: async () => found,
    resolve: async (id, movieId) => { writes.push([id, movieId]); }, defer: async row => { delayed.push(row.id); } });
  await worker.runOnce();
  assert.deepEqual(writes, []); assert.deepEqual(delayed, ['ui:one']);
  found = 8036;
  await worker.runOnce();
  assert.deepEqual(writes, [['ui:one', 8036]]);
});

test('a dispatch failure does not block already durable events', async () => {
  let counted = 0;
  const worker = createPopularityWorker({ dispatch: async () => { throw new Error('offline'); },
    pending: async () => [{ id: 'telegram:one', identity: {}, attempts: 0, catalogId: 3 }], match: async () => 3,
    resolve: async () => { counted++; }, defer: async () => {} });
  await worker.runOnce(); assert.equal(counted, 1);
});

test('overlapping timer ticks do not start competing batches in the same process', async () => {
  let release, scans = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const worker = createPopularityWorker({ dispatch: async () => { scans++; await pending; return 0; }, pending: async () => [],
    match: async () => null, resolve: async () => {}, defer: async () => {} });
  const first = worker.runOnce(); await worker.runOnce();
  assert.equal(scans, 1); release(); await first;
});

test('the event claim and total increment share one transaction; replay never increments twice', async () => {
  const transaction = mongoose.connection.transaction;
  const updateEvent = MovieSearchEvent.updateOne, updateTotal = MovieSearchTotal.updateOne;
  const session = {}; let claimed = false, increments = 0, transactions = 0;
  try {
    mongoose.connection.transaction = async work => { transactions++; return work(session); };
    MovieSearchEvent.updateOne = async (query, update, options) => {
      assert.deepEqual(query, { _id: 'ui:one', movieId: null });
      assert.deepEqual(update, { $set: { movieId: 8036 } }); assert.equal(options.session, session);
      if (claimed) return { modifiedCount: 0 }; claimed = true; return { modifiedCount: 1 };
    };
    MovieSearchTotal.updateOne = async (query, update, options) => {
      assert.deepEqual(query, { _id: 8036 }); assert.deepEqual(update, { $inc: { count: 1 } });
      assert.equal(options.session, session); assert.equal(options.upsert, true); increments++;
    };
    await resolveSearchEvent('ui:one', 8036); await resolveSearchEvent('ui:one', 8036);
    assert.equal(transactions, 2); assert.equal(increments, 1);
  } finally { mongoose.connection.transaction = transaction; MovieSearchEvent.updateOne = updateEvent; MovieSearchTotal.updateOne = updateTotal; }
});

test('parallel UI and Telegram requests count separately while duplicate deliveries remain idempotent', async () => {
  const original = { transaction: mongoose.connection.transaction, event: MovieSearchEvent.updateOne, total: MovieSearchTotal.updateOne };
  const claimed = new Set(); let total = 0;
  try {
    mongoose.connection.transaction = async work => work({});
    MovieSearchEvent.updateOne = async query => {
      if (claimed.has(query._id)) return { modifiedCount: 0 };
      claimed.add(query._id); return { modifiedCount: 1 };
    };
    MovieSearchTotal.updateOne = async (query, update) => { assert.equal(query._id, 8036); total += update.$inc.count; };
    const requests = ['ui:user-a-request', 'ui:user-b-request', 'telegram:new-request'];
    await Promise.all(Array.from({ length: 30 }, (_, index) => resolveSearchEvent(requests[index % 3], 8036)));
    assert.equal(total, 3); assert.equal(claimed.size, 3);
  } finally {
    mongoose.connection.transaction = original.transaction; MovieSearchEvent.updateOne = original.event; MovieSearchTotal.updateOne = original.total;
  }
});

test('top ten excludes removed films before limiting and does not expose private research', async () => {
  const original = MovieSearchTotal.aggregate;
  try {
    MovieSearchTotal.aggregate = async pipeline => {
      assert.deepEqual(pipeline[1], { $sort: { count: -1, _id: 1 } });
      assert.ok(pipeline.findIndex(stage => stage.$unwind) < pipeline.findIndex(stage => stage.$limit));
      assert.equal(pipeline.find(stage => stage.$limit).$limit, 10);
      assert.equal(pipeline.at(-1).$project.catalogResearch, 0);
      return [];
    };
    assert.deepEqual(await topSearchedMovies(), []);
  } finally { MovieSearchTotal.aggregate = original; }
});

test('a failing UI outbox item cannot block later UI searches or Telegram; deletion still preserves it', async () => {
  const original = { turns: ChatTurn.find, turnUpdate: ChatTurn.updateOne, bots: BotUpdate.find, botUpdate: BotUpdate.updateOne, eventUpdate: MovieSearchEvent.updateOne };
  const saved = [], acknowledgements = [], retries = [];
  const now = new Date();
  const query = rows => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => rows });
  try {
    ChatTurn.find = filter => {
      assert.equal(filter.status, 'completed'); assert.deepEqual(filter.origin, { $ne: 'telegram' });
      if (!filter.conversationId) assert.ok(filter.$or);
      return query([{ _id: 'bad', movie, createdAt: now }, { _id: 'good', movie, createdAt: now }]);
    };
    ChatTurn.updateOne = async (filter, patch) => {
      if (patch.$set.popularityPending === false) acknowledgements.push(`ui:${filter._id}`);
      if (patch.$set.popularityRetryAt) retries.push(filter._id);
    };
    BotUpdate.find = filter => { assert.ok(filter.$or); return query([{ _id: 'one', result: { movie }, createdAt: now }]); };
    BotUpdate.updateOne = async filter => { acknowledgements.push(`telegram:${filter._id}`); };
    MovieSearchEvent.updateOne = async (filter, patch, options) => {
      if (filter._id === 'ui:bad') throw Error('one malformed/unavailable item');
      assert.equal(options.upsert, true); assert.ok(patch.$setOnInsert.identity.originalTitle);
      assert.equal(patch.$setOnInsert.userId, undefined);
      saved.push(filter._id);
    };
    await dispatchSearchEvents();
    assert.deepEqual(saved, ['ui:good', 'telegram:one']);
    assert.deepEqual(acknowledgements, saved); assert.deepEqual(retries, ['bad']);
    await assert.rejects(() => dispatchSearchEvents({ userId: 'owner', conversationId: 'deleted-chat' }), /one malformed/);
  } finally {
    ChatTurn.find = original.turns; ChatTurn.updateOne = original.turnUpdate; BotUpdate.find = original.bots;
    BotUpdate.updateOne = original.botUpdate; MovieSearchEvent.updateOne = original.eventUpdate;
  }
});
