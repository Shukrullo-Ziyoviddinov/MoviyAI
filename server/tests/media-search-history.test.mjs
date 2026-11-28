import test from 'node:test';
import assert from 'node:assert/strict';
import { historyCursor, listSearchHistory, readSearchHistory, deleteSearchHistory } from '../dist/media-search/media-search-history.service.js';
import { finishSearchDeletion, maintainMediaSearches } from '../dist/media-search/media-search.maintenance.js';
import { MediaSearch, MediaSearchLease, MediaSearchDeletion } from '../dist/media-search/media-search.model.js';

const id = 'c9b36f4c-1137-4fb2-a732-c930cc629625';
const movie = { title: 'Example', titleUz: 'Misol', titleRu: null, confidence: 'high', posters: [{ url: 'https://example.test/poster.jpg' }], uzbekLinks: [] };
test('history pages are owner scoped, completed only, bounded and do not expose private keys', async () => {
  const find = MediaSearch.find;
  let filter, limit, projection;
  const rows = Array.from({ length: 21 }, (_, index) => ({ _id: id, kind: 'image', movie, createdAt: new Date(2026, 0, index + 1) }));
  const chain = { select(value) { projection = value; return this; }, sort() { return this; }, limit(value) { limit = value; return this; }, lean: async () => rows };
  MediaSearch.find = query => { filter = query; return chain; };
  try {
    const page = await listSearchHistory('owner');
    assert.equal(filter.userId, 'owner'); assert.equal(filter.status, 'completed'); assert.equal(filter.deletedAt, null);
    assert.equal(limit, 21); assert.equal(page.items.length, 20); assert.ok(page.nextCursor);
    assert.equal(page.items[0].poster, movie.posters[0].url);
    assert.equal(Object.hasOwn(page.items[0], 'key'), false);
    assert.ok(!projection.includes('checkpoints'));
    await listSearchHistory('owner', page.nextCursor);
    assert.equal(filter.$or[1]._id.$lt, id);
  } finally { MediaSearch.find = find; }
  assert.throws(() => historyCursor('invalid!'), error => error.status === 400);
});
test('reopening keeps old completed results and renews only the owned media URL, with no AI call', async () => {
  const find = MediaSearch.findOne;
  MediaSearch.findOne = filter => {
    assert.deepEqual(filter, { _id: id, userId: 'owner', status: 'completed', deletedAt: null });
    return { lean: async () => ({ key: 'private-owned-key', kind: 'video', movie, expiresAt: new Date(0) }) };
  };
  let signed = 0;
  try {
    const result = await readSearchHistory('owner', id, async (key, method) => { signed++; assert.equal(key, 'private-owned-key'); assert.equal(method, 'GET'); return 'https://r2.test/new-token'; });
    assert.equal(result.media.url, 'https://r2.test/new-token'); assert.equal(result.media.kind, 'video'); assert.equal(signed, 1);
    MediaSearch.findOne = () => ({ lean: async () => null });
    await assert.rejects(readSearchHistory('another-owner', id), error => error.status === 404);
  } finally { MediaSearch.findOne = find; }
});
test('history deletion hides first, retains failed cleanup, deletes R2 before DB, and catches late PUTs', async () => {
  const originals = { claim: MediaSearch.findOneAndUpdate, find: MediaSearch.findById, remove: MediaSearch.deleteOne, taskFind: MediaSearchDeletion.findById, taskUpdate: MediaSearchDeletion.updateOne, taskRemove: MediaSearchDeletion.deleteOne };
  let row = { _id: id, userId: 'owner', key: 'owned-key', movie, dispatchPending: false, expiresAt: new Date(Date.now() + 60000), deletedAt: null };
  let task, fail = true; const steps = [];
  MediaSearch.findOneAndUpdate = (filter, update) => ({ lean: async () => {
    assert.equal(filter.userId, 'owner'); row.deletedAt = update.$set.deletedAt; steps.push('hidden'); return row;
  } });
  MediaSearch.findById = () => ({ lean: async () => row });
  MediaSearch.deleteOne = async () => { steps.push('db'); row = null; };
  MediaSearchDeletion.findById = () => ({ lean: async () => task });
  MediaSearchDeletion.updateOne = async (_filter, update) => { if (update.$setOnInsert) task = { _id: id, ...update.$setOnInsert }; else Object.assign(task, update.$set); };
  MediaSearchDeletion.deleteOne = async () => { task = null; };
  const remove = async key => { assert.equal(key, 'owned-key'); steps.push('r2'); if (fail) throw Error('storage unavailable'); };
  try {
    const deleted = await deleteSearchHistory('owner', id, value => finishSearchDeletion(value, remove));
    assert.equal(deleted.pending, true); assert.ok(row.deletedAt); assert.ok(task); assert.ok(!steps.includes('db'));
    fail = false; await finishSearchDeletion(id, remove);
    assert.equal(row, null); assert.ok(steps.indexOf('r2') < steps.indexOf('db'));
    assert.ok(task); // Key-only task waits out the already-issued PUT URL.
    task.until = new Date(0); await finishSearchDeletion(id, remove);
    assert.equal(task, null);
  } finally {
    MediaSearch.findOneAndUpdate = originals.claim; MediaSearch.findById = originals.find; MediaSearch.deleteOne = originals.remove;
    MediaSearchDeletion.findById = originals.taskFind; MediaSearchDeletion.updateOne = originals.taskUpdate; MediaSearchDeletion.deleteOne = originals.taskRemove;
  }
});
test('automatic expiry excludes successful history records', async () => {
  const find = MediaSearch.find, taskFind = MediaSearchDeletion.find, leases = MediaSearchLease.deleteMany;
  const filters = [];
  const empty = { limit() { return this; }, lean: async () => [] };
  MediaSearch.find = filter => { filters.push(filter); return empty; };
  MediaSearchDeletion.find = () => empty; MediaSearchLease.deleteMany = async () => ({});
  try { await maintainMediaSearches(); assert.deepEqual(filters.find(filter => filter.expiresAt).status, { $ne: 'completed' }); }
  finally { MediaSearch.find = find; MediaSearchDeletion.find = taskFind; MediaSearchLease.deleteMany = leases; }
});

test('deleting another account search never schedules cleanup or touches R2', async () => {
  const claim = MediaSearch.findOneAndUpdate, update = MediaSearchDeletion.updateOne;
  let scheduled = false, removed = false;
  MediaSearch.findOneAndUpdate = filter => {
    assert.equal(filter.userId, 'another-owner');
    assert.equal(filter._id, id);
    assert.equal(filter.status, 'completed');
    return { lean: async () => null };
  };
  MediaSearchDeletion.updateOne = async () => { scheduled = true; };
  try {
    assert.deepEqual(await deleteSearchHistory('another-owner', id, async () => { removed = true; }), { id, pending: false });
    assert.equal(scheduled, false); assert.equal(removed, false);
  } finally { MediaSearch.findOneAndUpdate = claim; MediaSearchDeletion.updateOne = update; }
});
