import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createVideoImportService } from '../dist/ai/video-import/services/video-import.service.js';
import { createVideoImportWorker } from '../dist/ai/video-import/services/video-import-worker.service.js';
import { VideoImportJobError } from '../dist/ai/video-import/types/video-import-job.types.js';
import { VIDEO_IMPORT_QUEUE } from '../dist/ai/video-import/config/video-import.config.js';
import { validateVideoCheckpoint, validateVideoResult } from '../dist/ai/video-import/validators/video-job.validator.js';
import { abortVideoImport } from '../dist/ai/video-import/services/video-import-controls.service.js';
import { ChatFailure } from '../dist/ai/types/chat-progress.types.js';

const copy = value => value == null ? value : structuredClone(value);
function collection() {
  const rows = [];
  const get = (row, key) => key.split('.').reduce((value, part) => value?.[part], row);
  function matches(row, filter) {
    return Object.entries(filter).every(([key, expected]) => {
      if (key === '$or') return expected.some(item => matches(row, item));
      const value = get(row, key);
      if (expected === null && value == null) return true;
      if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
        if ('$in' in expected && !expected.$in.includes(value)) return false;
        if ('$lt' in expected && !(value < expected.$lt)) return false;
        if ('$lte' in expected && !(value <= expected.$lte)) return false;
        if ('$gt' in expected && !(value > expected.$gt)) return false;
        if ('$gte' in expected && !(value >= expected.$gte)) return false;
        return true;
      }
      return value instanceof Date && expected instanceof Date ? +value === +expected : value === expected;
    });
  }
  function set(row, fields) {
    for (const [key, value] of Object.entries(fields ?? {})) {
      const parts = key.split('.'); let current = row;
      for (const part of parts.slice(0, -1)) current = current[part] ??= {};
      current[parts.at(-1)] = copy(value);
    }
  }
  function update(row, changes, inserted = false) {
    if (inserted) set(row, changes.$setOnInsert);
    set(row, changes.$set);
    for (const [key, amount] of Object.entries(changes.$inc ?? {})) row[key] = (row[key] ?? 0) + amount;
    for (const [key,value] of Object.entries(changes.$addToSet??{})){row[key]??=[];if(!row[key].includes(value))row[key].push(value);}
  }
  return {
    rows,
    updateOne: async (filter, changes, options = {}) => {
      let row = rows.find(value => matches(value, filter));
      if (!row && options.upsert) {
        if (rows.some(value => value._id === filter._id)) throw Object.assign(Error('Duplicate key'), { code: 11000 });
        row = { ...filter, createdAt: new Date() }; rows.push(row); update(row, changes, true);
        return { matchedCount: 0, upsertedCount: 1 };
      }
      if (!row) return { matchedCount: 0 };
      update(row, changes); return { matchedCount: 1 };
    },
    updateMany: async (filter, changes) => { for (const row of rows.filter(value => matches(value, filter))) update(row, changes); },
    findOne: filter => ({ lean: async () => copy(rows.find(row => matches(row, filter))) }),
    findOneAndUpdate: (filter, changes, options = {}) => ({ lean: async () => {
      const candidates = rows.filter(row => matches(row, filter));
      if (options.sort) candidates.sort((a, b) => {
        for (const [key, direction] of Object.entries(options.sort)) { const x = get(a, key), y = get(b, key); if (x < y) return -direction; if (x > y) return direction; }
        return 0;
      });
      const row = candidates[0]; if (!row) return null;
      update(row, changes); return copy(row);
    } }),
  };
}
function harness() {
  const jobs = collection(), slots = collection();
  const source = readFileSync(new URL('../dist/ai/video-import/repositories/video-import-job.repository.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  const repository = new Function('VideoImportJobModel', 'VideoImportSlotModel', 'VIDEO_IMPORT_QUEUE', 'VideoImportJobError',
    `${source}\nreturn videoImportJobRepository;`)(jobs, slots, VIDEO_IMPORT_QUEUE, VideoImportJobError);
  const service = createVideoImportService(repository);
  let now = new Date('2026-11-18T10:00:00Z');
  return { repository, service, jobs, slots, now: () => now, advance: ms => { now = new Date(+now + ms); } };
}
const alice = { kind: 'user', id: 'alice' }, bob = { kind: 'user', id: 'bob' };
const input = { conversationId: 'chat-1', requestId: 'request-1', url: 'https://youtu.be/dQw4w9WgXcQ?tracking=1' };
const result = job => ({ canonicalUrl: job.canonicalUrl, videoId: job.videoId, r2Key: `videoimport/${job.id}/${'a'.repeat(64)}.mp4`,
  metadata: { durationSeconds: 10, sizeBytes: 1024, mimeType: 'video/mp4', width: 640, height: 360, hasAudio: true } });
async function claim(h, token) { return h.repository.claim(h.now(), token, new Date(+h.now() + VIDEO_IMPORT_QUEUE.leaseMs)); }

test('the same message concurrently creates one durable job and preserves the first original URL', async () => {
  const h = harness();
  const jobs = await Promise.all(Array.from({ length: 10 }, () => h.service.enqueue(alice, input)));
  assert.equal(new Set(jobs.map(job => job.id)).size, 1); assert.equal(h.jobs.rows.length, 1);
  const alias = await h.service.enqueue(alice, { ...input, url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });
  assert.equal(alias.id, jobs[0].id); assert.equal(alias.originalUrl, input.url); assert.equal(alias.status, 'queued');
  assert.equal(alias.r2Key, null); assert.equal(alias.metadata.durationSeconds, null);
});
test('changing video under the same request ID conflicts instead of replacing queued input', async () => {
  const h = harness(); await h.service.enqueue(alice, input);
  await assert.rejects(() => h.service.enqueue(alice, { ...input, url: 'https://www.instagram.com/reel/example/' }), error => error.code === 'REQUEST_CONFLICT');
  assert.equal(h.jobs.rows.length, 1);
});
test('ownership separates users and Telegram identities and blocks foreign reads/cancels', async () => {
  const h = harness(), first = await h.service.enqueue(alice, input);
  const other = await h.service.enqueue(bob, input);
  const telegram = await h.service.enqueue({ kind: 'telegram', id: 'alice' }, input);
  assert.equal(new Set([first.id, other.id, telegram.id]).size, 3);
  assert.equal(await h.service.get(bob, first.id), null);
  assert.equal(await h.service.cancel(bob, first.id), false);
  assert.equal((await h.service.get(alice, first.id)).status, 'queued');
});
test('shared Mongo slots bound parallel claims even across separate worker calls', async () => {
  const h = harness(); await h.service.enqueue(alice, input); await h.service.enqueue(bob, input);
  const [a, b] = await Promise.all([claim(h, 'worker-a'), claim(h, 'worker-b')]);
  assert.equal([a, b].filter(Boolean).length, 1);
  const claimed = a ?? b;
  assert.equal(await claim(h, 'worker-c'), null);
  await h.repository.complete(claimed, result(claimed), h.now()); await h.repository.release(claimed);
  assert.ok(await claim(h, 'worker-next'));
});

test('explicit resume is owner-scoped, waits for the cancelled worker to stop and retains its reserved R2 object',async()=>{
 const h=harness();h.advance(Date.now()-Number(h.now()));
 const queued=await h.service.enqueue(alice,input),running=await claim(h,'old-worker');
 const saved=result(running);await h.repository.checkpoint(running,{...saved,stage:'uploading'},h.now());
 await h.service.cancel(alice,queued.id);
 assert.equal(await h.service.resume(bob,queued.id),false);
 assert.equal(await h.service.resume(alice,queued.id),false);
 await h.repository.release(running);
 assert.equal(await h.service.resume(alice,queued.id),true);
 const retried=await h.service.get(alice,queued.id);assert.equal(retried.status,'retry');assert.equal(retried.r2Key,saved.r2Key);
 assert.equal(retried.metadata.sizeBytes,saved.metadata.sizeBytes);assert.equal(retried.attempts,0);
});
test('expired work resumes with its checkpoint while the stale worker cannot write or release its new slot', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input);
  const old = await claim(h, 'old-token');
  await h.repository.checkpoint(old, { stage: 'probing', metadata: { durationSeconds: 10 } }, h.now());
  h.advance(VIDEO_IMPORT_QUEUE.leaseMs + 1);
  const next = await claim(h, 'new-token');
  assert.equal(next.id, queued.id); assert.equal(next.attempts, 2); assert.equal(next.metadata.durationSeconds, 10);
  assert.equal(await h.repository.checkpoint(old, { stage: 'downloading' }, h.now()), false);
  assert.equal(await h.repository.complete(old, result(old), h.now()), false);
  assert.equal(await h.repository.renew(old, h.now(), new Date(+h.now() + 60000)), false);
  await h.repository.release(old);
  assert.equal(h.slots.rows[0].leaseToken, 'new-token');
});
test('retry delays are durable, attempts are bounded, and exhausted crashed jobs fail', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input);
  for (let index = 0; index < VIDEO_IMPORT_QUEUE.maxAttempts; index++) {
    const current = await claim(h, `token-${index}`); assert.ok(current);
    h.advance(VIDEO_IMPORT_QUEUE.leaseMs + 1);
  }
  assert.equal(await claim(h, 'too-many'), null);
  assert.equal((await h.service.get(alice, queued.id)).status, 'failed');
});
test('a running cancelled job retains its slot until its worker has stopped and cannot complete', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input);
  await h.service.enqueue(bob, input);
  const running = await claim(h, 'running');
  assert.equal(await h.service.cancel(alice, queued.id), true);
  assert.equal(await claim(h, 'must-wait'), null);
  assert.equal(await h.repository.complete(running, result(running), h.now()), false);
  assert.equal(await h.repository.renew(running, h.now(), new Date(+h.now() + 60000)), false);
  await h.repository.release(running);
  assert.ok(await claim(h, 'next'));
});
test('worker checkpoints partial metadata, commits the result and releases capacity', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input);
  const worker = createVideoImportWorker({ jobs: h.repository, now: h.now, process: async (job, signal, checkpoint) => {
    assert.equal(signal.aborted, false);
    await checkpoint({ stage: 'downloading', metadata: { width: 640 } });
    await checkpoint({ stage: 'probing', metadata: { durationSeconds: 10 } });
    assert.equal(job.metadata.width, 640); assert.equal(job.metadata.durationSeconds, 10);
    return result(job);
  } });
  await worker.runOnce();
  const saved = await h.service.get(alice, queued.id);
  assert.equal(saved.status, 'completed'); assert.equal(saved.stage, 'ready'); assert.equal(saved.metadata.width, 640);
  assert.match(saved.r2Key, /^videoimport\//); assert.equal(h.slots.rows[0].leaseToken, '');
});
test('two workers cannot run two processors at the same time', async () => {
  const h = harness(); await h.service.enqueue(alice, input); await h.service.enqueue(bob, input);
  let release, active = 0, peak = 0;
  const hold = new Promise(resolve => { release = resolve; });
  const process = async job => { active++; peak = Math.max(peak, active); await hold; active--; return result(job); };
  const a = createVideoImportWorker({ jobs: h.repository, now: h.now, process }), b = createVideoImportWorker({ jobs: h.repository, now: h.now, process });
  const tasks = [a.runOnce(), a.runOnce(), b.runOnce()];
  await new Promise(resolve => setImmediate(resolve)); assert.equal(peak, 1);
  release(); await Promise.all(tasks); assert.equal(peak, 1);
});
test('transient processor failures retry with backoff; permanent validation failures do not', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input); let calls = 0;
  const worker = createVideoImportWorker({ jobs: h.repository, now: h.now, process: async job => {
    if (++calls === 1) throw Object.assign(Error('Private URL must not be stored'), { code: 'NETWORK_ERROR' });
    return result(job);
  } });
  await worker.runOnce(); let saved = await h.service.get(alice, queued.id);
  assert.equal(saved.status, 'retry'); assert.equal(saved.errorCode, 'NETWORK_ERROR');
  await worker.runOnce(); assert.equal(calls, 1);
  h.advance(10001); await worker.runOnce(); assert.equal(calls, 2);
  assert.equal((await h.service.get(alice, queued.id)).status, 'completed');
  const next = await h.service.enqueue(alice, { ...input, requestId: 'invalid-result' });
  const invalid = createVideoImportWorker({ jobs: h.repository, now: h.now, process: async job => ({ ...result(job), r2Key: `videoimport/${'f'.repeat(64)}/${'a'.repeat(64)}.mp4` }) });
  await invalid.runOnce(); saved = await h.service.get(alice, next.id);
  assert.equal(saved.status, 'failed'); assert.equal(saved.errorCode, 'INVALID_JOB'); assert.equal(saved.r2Key, null);
});
test('the worker never marks a cancelled or stopped operation completed', async () => {
  const h = harness(), queued = await h.service.enqueue(alice, input);
  let worker;
  worker = createVideoImportWorker({ jobs: h.repository, now: h.now, process: async job => {
    worker.stop(); return result(job);
  } });
  await worker.runOnce();
  assert.notEqual((await h.service.get(alice, queued.id)).status, 'completed');
});
test('preparation timeouts fail once instead of automatically repeating CPU-heavy conversion',async()=>{
 const h=harness(),queued=await h.service.enqueue(alice,input);let calls=0;
 const worker=createVideoImportWorker({jobs:h.repository,now:h.now,process:async(_job,_signal,checkpoint)=>{
  calls++;await checkpoint({stage:'probing'});throw Object.assign(Error('preparation timed out'),{code:'PREPARATION_TIMEOUT'});
 }});
 await worker.runOnce();h.advance(60000);await worker.runOnce();const saved=await h.service.get(alice,queued.id);
 assert.equal(calls,1);assert.equal(saved.status,'failed');assert.equal(saved.errorCode,'PREPARATION_TIMEOUT');assert.equal(saved.attempts,1);
});

test('checkpoint identity and final metadata cannot change the requested film source or point to another job object', async () => {
  const h = harness(); await h.service.enqueue(alice, input); const job = await claim(h, 'token');
  assert.throws(() => validateVideoCheckpoint(job, { canonicalUrl: 'https://www.instagram.com/reel/example/', videoId: 'example' }), error => error.code === 'INVALID_JOB');
  assert.throws(() => validateVideoResult(job, { ...result(job), metadata: { ...result(job).metadata, durationSeconds: null } }), error => error.code === 'INVALID_JOB');
  assert.throws(() => validateVideoCheckpoint(job, { r2Key: `videoimport/${job.id}/../another.mp4` }), error => error.code === 'INVALID_JOB');
  assert.throws(() => validateVideoResult(job, { ...result(job), r2Key: '' }), error => error.code === 'INVALID_JOB');
  assert.throws(() => validateVideoCheckpoint(job, { metadata: {} }), error => error.code === 'INVALID_JOB');
  assert.throws(() => createVideoImportWorker({}), error => error.code === 'INVALID_JOB');
});
test('Mongo model starts with explicit unknown metadata and never TTL-deletes R2 references', async () => {
  const { VideoImportJobModel } = await import('../dist/ai/video-import/models/video-import.model.js');
  const doc = new VideoImportJobModel({ _id: 'a'.repeat(64), ownerKind: 'user', ownerId: 'alice', conversationId: 'chat', requestId: 'request',
    originalUrl: input.url, canonicalUrl: input.url, platform: 'youtube', fingerprint: 'b'.repeat(64) });
  await doc.validate();
  assert.equal(doc.status, 'queued'); assert.equal(doc.metadata.durationSeconds, null); assert.equal(doc.r2Key, null);
  const indexes = VideoImportJobModel.schema.indexes();
  assert.ok(indexes.some(([fields, settings]) => fields.ownerKind && fields.ownerId && fields.requestId && settings.unique));
  assert.equal(indexes.some(([, settings]) => settings.expireAfterSeconds !== undefined), false);
});

test('deletion tombstones block get/resume/claim and all reserved R2 keys survive retries',async()=>{
 const h=harness(),queued=await h.service.enqueue(alice,input),running=await claim(h,'worker');
 for(const hash of ['a','b'])await h.repository.checkpoint(running,{r2Key:`videoimport/${queued.id}/${hash.repeat(64)}.mp4`},h.now());
 assert.equal(h.jobs.rows[0].reservedKeys.length,2);
 h.jobs.rows[0].deletedAt=new Date();h.jobs.rows[0].status='cancelled';await h.repository.release(running);
 assert.equal(await h.service.get(alice,queued.id),null);assert.equal(await h.service.resume(alice,queued.id),false);
 assert.equal(await claim(h,'late-worker'),null);await assert.rejects(()=>h.service.enqueue(alice,input),{code:'REQUEST_CONFLICT'});
});
test('local stop cancels a real worker immediately, keeps its reservation, and releases its slot',async()=>{
 const h=harness(),queued=await h.service.enqueue(alice,input);let entered;
 const ready=new Promise(resolve=>{entered=resolve;});
 const worker=createVideoImportWorker({jobs:h.repository,now:h.now,process:async(job,signal,checkpoint)=>{
  await checkpoint({...result(job),stage:'uploading'});entered();await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }});
 const pending=worker.runOnce();await ready;await h.service.cancel(alice,queued.id);abortVideoImport(queued.id,new ChatFailure('stopped'));await pending;
 const saved=await h.service.get(alice,queued.id);assert.equal(saved.status,'cancelled');assert.ok(saved.r2Key);assert.equal(h.slots.rows[0].leaseToken,'');
});
