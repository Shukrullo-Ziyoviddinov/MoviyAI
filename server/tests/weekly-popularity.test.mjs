import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeeklyRanking, weeklyRankingPipeline } from '../dist/movie-popularity/rankings/weekly.service.js';
import { MovieSearchEvent } from '../dist/movie-popularity/models.js';
import { topSearchedMovies } from '../dist/movie-popularity/rankings/lifetime.service.js';
import { MovieSearchTotal } from '../dist/movie-popularity/models.js';

const now = new Date('2026-11-22T10:00:00Z'), week = 7 * 86400000;
test('weekly window uses occurrence time, includes the exact seven-day boundary and excludes future/unresolved events', () => {
  const pipeline = weeklyRankingPipeline(now), match = pipeline[0].$match;
  assert.equal(match.occurredAt.$gte.getTime(), now.getTime() - week);
  assert.equal(match.occurredAt.$lte.getTime(), now.getTime());
  assert.deepEqual(match.movieId, { $gt: 0 });
  const events = [
    { movieId: 1, occurredAt: new Date(now.getTime() - week - 1), updatedAt: now },
    { movieId: 2, occurredAt: new Date(now.getTime() - week) },
    { movieId: 2, occurredAt: now },
    { movieId: 3, occurredAt: new Date(now.getTime() + 1) },
    { movieId: null, occurredAt: now },
  ];
  const included = events.filter(event => event.movieId > match.movieId.$gt && event.occurredAt >= match.occurredAt.$gte && event.occurredAt <= match.occurredAt.$lte);
  assert.deepEqual(included.map(event => event.movieId), [2,2]);
  assert.deepEqual(pipeline[1], { $group: { _id: '$movieId', count: { $sum: 1 } } });
  assert.deepEqual(pipeline[2], { $sort: { count: -1, _id: 1 } });
  assert.ok(pipeline.findIndex(stage => stage.$unwind) < pipeline.findIndex(stage => stage.$limit));
  assert.equal(pipeline.find(stage => stage.$limit).$limit, 10);
  assert.equal(pipeline.at(-1).$project.catalogResearch, 0);
  assert.throws(() => weeklyRankingPipeline(new Date('invalid')), /Invalid ranking time/);
});

test('weekly reads coalesce concurrent requests and recalculate the moving window after cache expiry', async () => {
  let time = now.getTime(), reads = 0, release;
  const wait = new Promise(resolve => { release = resolve; });
  const times = [];
  const list = createWeeklyRanking({ now: () => time, read: async date => {
    reads++; times.push(date.getTime()); if (reads === 1) await wait;
    return [{ id: reads, searchCount: 2 }];
  } });
  const first = list(), second = list();
  assert.equal(reads, 1); release();
  assert.deepEqual(await first, await second);
  time += 14999; assert.equal((await list())[0].id, 1); assert.equal(reads, 1);
  time += 1; assert.equal((await list())[0].id, 2); assert.equal(reads, 2);
  assert.deepEqual(times, [now.getTime(), time]);
});

test('weekly empty results are cached and a failed read is retried without poisoning the cache', async () => {
  let time = 0, calls = 0;
  const list = createWeeklyRanking({ now: () => time, read: async () => {
    calls++; if (calls === 1) throw Error('DB unavailable'); return [];
  } });
  await assert.rejects(list, /DB unavailable/);
  assert.deepEqual(await list(), []); assert.deepEqual(await list(), []); assert.equal(calls, 2);
  time = 15000; await list(); assert.equal(calls, 3);
});

test('reading weekly ranking never mutates lifetime counts or resolves the same event again', async () => {
  const original = { aggregate: MovieSearchEvent.aggregate, total: MovieSearchTotal.updateOne, event: MovieSearchEvent.updateOne };
  let reads = 0;
  try {
    MovieSearchTotal.updateOne = () => { throw Error('must not increment totals'); };
    MovieSearchEvent.updateOne = () => { throw Error('must not rewrite events'); };
    MovieSearchEvent.aggregate = pipeline => ({ exec: async () => { reads++; assert.ok(pipeline[0].$match.occurredAt); return []; } });
    assert.deepEqual(await createWeeklyRanking()(), []); assert.equal(reads, 1);
  } finally { MovieSearchEvent.aggregate = original.aggregate; MovieSearchTotal.updateOne = original.total; MovieSearchEvent.updateOne = original.event; }
});

test('the existing lifetime ranking keeps its original total-based pipeline', async () => {
  const original = MovieSearchTotal.aggregate;
  try {
    MovieSearchTotal.aggregate = async pipeline => {
      assert.deepEqual(pipeline[0], { $match: { count: { $gt: 0 } } });
      assert.equal(JSON.stringify(pipeline).includes('occurredAt'), false);
      assert.equal(pipeline.find(stage => stage.$limit).$limit, 10); return [];
    };
    assert.deepEqual(await topSearchedMovies(), []);
  } finally { MovieSearchTotal.aggregate = original; }
});
