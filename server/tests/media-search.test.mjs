import test from 'node:test';
import assert from 'node:assert/strict';
import { searchUpload, validSearchImage } from '../dist/media-search/media-search.validator.js';
import { identifySearchUpload, publicSearchMovie, analyzeSearch, reserveSearch } from '../dist/media-search/media-search.service.js';
import { MediaSearch, MediaSearchLease, MediaSearchDeletion } from '../dist/media-search/media-search.model.js';

const originalDeletionExists = MediaSearchDeletion.exists;
test.beforeEach(() => { MediaSearchDeletion.exists = async () => null; });
test.afterEach(() => { MediaSearchDeletion.exists = originalDeletionExists; });

const id = 'c9b36f4c-1137-4fb2-a732-c930cc629625';
const input = { id, kind: 'image', size: 120, mimeType: 'image/jpeg', hash: 'a'.repeat(64) };
test('media search accepts one bounded attachment, not arbitrary URLs or extra fields', () => {
  assert.equal(searchUpload.safeParse(input).success, true);
  for (const change of [{ url: 'https://example.com/private' }, { size: 5 * 1024 * 1024 }, { mimeType: 'text/html' }, { hash: '../secret' }, { id: '../chat' }])
    assert.equal(searchUpload.safeParse({ ...input, ...change }).success, false);
  assert.equal(searchUpload.safeParse({ ...input, kind: 'video', mimeType: 'video/mp4', size: 80 * 1024 * 1024 }).success, true);
  assert.equal(searchUpload.safeParse({ ...input, kind: 'video', mimeType: 'video/mp4', size: 81 * 1024 * 1024 }).success, false);
  assert.equal(validSearchImage('image/jpeg', Buffer.from([255, 216, 255])), true);
  assert.equal(validSearchImage('image/jpeg', Buffer.from('<html>')), false);
});
test('recognition receives signed R2 media in brief mode and never uploaded bytes', async () => {
  let args;
  const signal = new AbortController().signal;
  const row = { kind: 'image', key: 'owned-key', size: 120, mimeType: 'image/jpeg' };
  await identifySearchUpload(row, 'uz', signal, undefined, {
    image: async key => { assert.equal(key, 'owned-key'); return { size: 120, mimeType: 'image/jpeg', bytes: Buffer.from([255, 216, 255]) }; },
    sign: async (key, method) => { assert.equal(key, 'owned-key'); assert.equal(method, 'GET'); return 'https://r2.example.test/signed'; },
    identify: async (...values) => { args = values; return {}; },
  });
  assert.deepEqual(args[1], [{ mimeType: 'image/jpeg', fileUri: 'https://r2.example.test/signed' }]);
  assert.equal(args[3], signal);
  assert.equal(args[4], 'brief');
});
test('bad signatures, changed metadata and long videos stop before any AI request', async () => {
  let calls = 0;
  const deps = { image: async () => ({ size: 120, mimeType: 'image/jpeg', bytes: Buffer.from('<html>') }), video: async () => ({ size: 120, mimeType: 'video/mp4', duration: 181 }), identify: async () => { calls++; }, sign: async () => { throw Error('must not sign'); } };
  await assert.rejects(identifySearchUpload({ kind: 'image', key: 'key', size: 120, mimeType: 'image/jpeg' }, 'uz', new AbortController().signal, undefined, deps), error => error.failureCode === 'insufficient_evidence');
  await assert.rejects(identifySearchUpload({ kind: 'video', key: 'key', size: 120, mimeType: 'video/mp4' }, 'uz', new AbortController().signal, undefined, deps), error => error.failureCode === 'video_unreadable');
  assert.equal(calls, 0);
});
test('result response contains only title, posters and dubbed links, with no private media or full dossier', () => {
  const movie = { title: 'Example', titleUz: 'Misol', titleRu: null, year: 2020, confidence: 'high', posters: [], uzbekLinks: [], sources: [{ url: 'private' }], details: { synopsis: 'not in result modal' }, key: 'private-key' };
  assert.deepEqual(Object.keys(publicSearchMovie(movie)).sort(), ['title','titleUz','titleRu','year','confidence','sources','posters','uzbekLinks'].sort());
  assert.deepEqual(publicSearchMovie(movie).sources, []);
});
test('cached results require ownership and retry cannot take another user reservation', async () => {
  const find = MediaSearch.findOne, update = MediaSearch.updateOne;
  try {
    MediaSearch.findOne = filter => { assert.equal(filter.userId, 'owner'); return { lean: async () => null }; };
    await assert.rejects(analyzeSearch('owner', id, 'uz', new AbortController().signal), error => error.status === 404);
    MediaSearch.updateOne = async () => { throw Object.assign(Error('duplicate'), { code: 11000 }); };
    await assert.rejects(reserveSearch('another-owner', input), error => error.status === 409);
  } finally { MediaSearch.findOne = find; MediaSearch.updateOne = update; }
  assert.equal(MediaSearch.collection.name, 'ai_media_searches');
  assert.ok(!MediaSearch.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined));
});

test('a crashed search can reserve again after its processing lease expires, but an active search cannot', async () => {
  const update = MediaSearch.updateOne, find = MediaSearch.findOne;
  let signed = 0;
  const row = { ...input, key: 'owned-key', expiresAt: new Date(Date.now() + 3600000), status: 'processing', lockUntil: new Date(Date.now() - 1000) };
  MediaSearch.updateOne = async () => ({});
  MediaSearch.findOne = () => ({ lean: async () => row });
  const sign = async () => { signed++; return 'https://r2.example.test/put'; };
  try {
    const upload = await reserveSearch('owner', input, sign);
    assert.equal(upload.url, 'https://r2.example.test/put');
    row.lockUntil = new Date(Date.now() + 60000);
    await assert.rejects(reserveSearch('owner', input, sign), error => error.status === 409);
    assert.equal(signed, 1);
  } finally { MediaSearch.updateOne = update; MediaSearch.findOne = find; }
});

test('a result completed between lookup and claim is returned rather than rerunning AI', async () => {
  const original = { find: MediaSearch.findOne, claim: MediaSearch.findOneAndUpdate, lease: MediaSearchLease.findOneAndUpdate, release: MediaSearchLease.updateOne };
  const movie = { title: 'Example', titleUz: null, titleRu: null, year: 2020, confidence: 'high', posters: [], uzbekLinks: [] };
  let lookups = 0, releases = 0;
  MediaSearch.findOne = filter => {
    assert.equal(filter.userId, 'owner');
    return { lean: async () => ++lookups === 1 ? { status: 'processing' } : { movie } };
  };
  MediaSearch.findOneAndUpdate = filter => {
    assert.deepEqual(filter.status, { $ne: 'completed' });
    return { lean: async () => null };
  };
  MediaSearchLease.findOneAndUpdate = async () => ({});
  MediaSearchLease.updateOne = async () => { releases++; };
  try {
    const result = await analyzeSearch('owner', id, 'uz', new AbortController().signal);
    assert.equal(result.title, movie.title);
    assert.equal(lookups, 2);
    assert.equal(releases, 1);
  } finally {
    MediaSearch.findOne = original.find; MediaSearch.findOneAndUpdate = original.claim;
    MediaSearchLease.findOneAndUpdate = original.lease; MediaSearchLease.updateOne = original.release;
  }
});
