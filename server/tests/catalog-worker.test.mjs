import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogWorker } from '../dist/ai/catalog/services/catalog-worker.service.js';
import { createCatalogDispatcher } from '../dist/ai/catalog/services/catalog-dispatch.service.js';
import { catalogChatInput, catalogJobId, isCatalogEligible } from '../dist/ai/catalog/utils/catalog-chat-input.js';
import { catalogOperation } from '../dist/ai/catalog/utils/catalog-diagnostics.js';

const movie = { title: 'Example', titleUz: 'Misol', titleRu: null, year: 2014, confidence: 'high', sources: [{ title: 'Film', url: 'https://example.com/film' }], posters: [] };
const input = { movie, language: 'uz', actorImages: [] };
function harness() {
  let now = 0;
  const row = { id: 'job', input, draft: null, status: 'pending', attempts: 0, next: 0, until: 0, token: '' };
  const jobs = {
    async claim(date, token, until) {
      if (row.attempts >= 5 || row.status === 'completed' || row.status === 'failed' || row.status === 'processing' && row.until > date.getTime() || row.status !== 'processing' && row.next > date.getTime()) return null;
      row.status = 'processing'; row.token = token; row.until = until.getTime(); row.attempts++;
      return { id: row.id, input: structuredClone(row.input), draft: structuredClone(row.draft), attempts: row.attempts, leaseToken: token };
    },
    async renew(_id, token, until) { if (row.token !== token) return false; row.until = until.getTime(); return true; },
    async checkpoint(_id, token, draft) { if (row.token !== token) return false; row.draft = structuredClone(draft); return true; },
    async complete(_id, token, movieId) { if (row.token === token) { row.status = 'completed'; row.movieId = movieId; } },
    async defer(_id, token, status, next, issues) { if (row.token === token) { row.status = status; row.next = next.getTime(); row.issues = issues; } },
  };
  return { row, jobs, now: () => new Date(now), time: value => { now = value; } };
}

test('only supported complete movie results queue, never greetings, guesses or Uzbek-link-only follow-ups', () => {
  assert.equal(isCatalogEligible(movie), true);
  for (const value of [undefined, null, { ...movie, catalogId:8001 }, { ...movie, confidence: 'low' }, { ...movie, linksOnly: true }, { ...movie, sources: [] }, { ...movie, title: '' }]) assert.equal(isCatalogEligible(value), false);
  const payload = catalogChatInput({ ...movie, privateFrame: 'must not enter job' }, [{ label: 'Actor', kind: 'actor', imageUrl: 'https://example.com/actor.jpg', sourceUrl: null }, { label: 'Character', kind: 'character', imageUrl: 'https://example.com/character.jpg', sourceUrl: null }]);
  assert.equal(payload.movie.privateFrame, undefined); assert.equal(payload.actorImages.length, 1); assert.equal(payload.actorImages[0].label, 'Actor');
  const filmEvidence=[{title:'Verified film',url:'https://www.imdb.com/title/tt1234567/'}];
  assert.deepEqual(catalogChatInput({...movie,identitySources:filmEvidence},[]).movie.identitySources,filmEvidence);
  assert.notEqual(catalogJobId('ab', 'c'), catalogJobId('a', 'bc'));
});

test('crash after durable enqueue but before outbox acknowledgement retries without duplicating/resetting a job', async () => {
  const turns = [{ id: 'turn', conversationId: 'c', requestId: 'r', movie, portraits: [], state: 'pending' }], records = new Map(); let fail = true;
  const dispatcher = createCatalogDispatcher({ pending: async () => turns.filter(turn => turn.state === 'pending'), enqueue: async (id, data) => { if (!records.has(id)) records.set(id, { input: data, status: 'completed' }); },
    markQueued: async id => { if (fail) { fail = false; throw Error('crash'); } turns.find(turn => turn.id === id).state = 'queued'; } });
  await assert.rejects(() => dispatcher.dispatch(), /crash/); assert.equal(records.size, 1);
  await dispatcher.dispatch(); assert.equal(records.size, 1); assert.equal([...records.values()][0].status, 'completed'); assert.equal(turns[0].state, 'queued');
});

test('conversation deletion preserves every pending public movie job independently of chat rows', async () => {
  const turns = Array.from({ length: 55 }, (_, index) => ({ id: String(index), conversationId: 'c', userId: 'u', requestId: String(index), movie, portraits: [], state: 'pending' })); const records = new Map();
  const dispatcher = createCatalogDispatcher({ pending: async (scope, limit) => turns.filter(turn => turn.state === 'pending' && turn.userId === scope.userId && turn.conversationId === scope.conversationId).slice(0, limit),
    enqueue: async (id, data) => { records.set(id, data); }, markQueued: async id => { turns.find(turn => turn.id === id).state = 'queued'; } });
  await dispatcher.preserveConversation('u', 'c'); turns.length = 0; assert.equal(records.size, 55);
  assert.equal([...records.values()][0].movie.title, 'Example');
});

test('separate workers atomically lease a durable job only once', async () => {
  const h = harness(); let calls = 0;
  const deps = { jobs: h.jobs, now: h.now, dispatch: async () => 0, process: async () => { calls++; await Promise.resolve(); return { status: 'created', movieId: 8001, actorIds: [9001], posters: [] }; } };
  await Promise.all([createCatalogWorker(deps).runOnce(), createCatalogWorker(deps).runOnce()]);
  assert.equal(calls, 1); assert.equal(h.row.status, 'completed'); assert.equal(h.row.movieId, 8001);
});

test('provider/storage error keeps checkpoints and retries with backoff; restart resumes instead of regenerating the chat', async () => {
  const h = harness(); let paidResearch = 0;
  const process = async (_input, saved, _signal, checkpoint) => {
    if (!saved) { paidResearch++; await checkpoint({ version: 1, checkpointMarker: 'enriched' }); throw Error('R2 failed'); }
    assert.equal(saved.checkpointMarker, 'enriched'); return { status: 'existing', movieId: 8001 };
  };
  await createCatalogWorker({ jobs: h.jobs, now: h.now, dispatch: async () => 0, process }).runOnce();
  assert.equal(h.row.status, 'retry'); assert.equal(h.row.next, 30000); assert.equal(h.row.input.movie.title, 'Example');
  h.time(30001); await createCatalogWorker({ jobs: h.jobs, now: h.now, dispatch: async () => 0, process }).runOnce();
  assert.equal(h.row.status, 'completed'); assert.equal(paidResearch, 1); assert.equal(h.row.attempts, 2);
});

test('worker retains safe provider/stage/status for a retried failure without persisting secret SDK text',async()=>{
 const h=harness();await createCatalogWorker({jobs:h.jobs,now:h.now,dispatch:async()=>0,
  process:()=>catalogOperation({provider:'google',stage:'actor-facts',model:'test-model'},async()=>{throw Object.assign(Error('SECRET_KEY private user message'),{status:503});}),
 }).runOnce();
 assert.equal(h.row.status,'retry');assert.equal(h.row.next,30000);
 assert.match(h.row.issues[0].message,/provider=google, stage=actor-facts, status=503/);
 assert.doesNotMatch(JSON.stringify(h.row.issues),/SECRET_KEY|private user message/);
});

test('expired processing leases recover after a restart, while old lease tokens cannot change job state', async () => {
  const h = harness(); h.row.status = 'processing'; h.row.until = 1000; h.row.token = 'old'; h.row.attempts = 1; h.time(1001);
  await createCatalogWorker({ jobs: h.jobs, now: h.now, dispatch: async () => 0, process: async () => ({ status: 'existing', movieId: 8001 }) }).runOnce();
  assert.equal(h.row.status, 'completed'); assert.equal(h.row.attempts, 2);
  await h.jobs.defer('job', 'old', 'failed', new Date(), []); assert.equal(h.row.status, 'completed');
});

test('missing verified fields defer safely; repeated infrastructure failure has a bounded attempt limit', async () => {
  const h = harness();
  await createCatalogWorker({ jobs: h.jobs, now: h.now, dispatch: async () => 0, process: async () => ({ status: 'needs-enrichment', issues: [{ path: 'filterCountry', action: 'resolve-reference', blocking: true, message: 'Missing country' }] }) }).runOnce();
  assert.equal(h.row.status, 'needs-enrichment'); assert.equal(h.row.next, 6 * 60 * 60 * 1000); assert.equal(h.row.issues[0].path, 'filterCountry');
  const failed = harness(); failed.row.attempts = 4;
  await createCatalogWorker({ jobs: failed.jobs, now: failed.now, dispatch: async () => 0, process: async () => { throw Error('provider down'); } }).runOnce();
  assert.equal(failed.row.status, 'failed'); assert.equal(failed.row.attempts, 5);
});

test('outbox failure does not block previously durable jobs and worker errors do not escape to chat', async () => {
  const h = harness();
  await createCatalogWorker({ jobs: h.jobs, now: h.now, dispatch: async () => { throw Error('dispatch failed'); }, process: async () => ({ status: 'existing', movieId: 8001 }) }).runOnce();
  assert.equal(h.row.status, 'completed');
  await createCatalogWorker({ jobs: { ...h.jobs, claim: async () => { throw Error('DB down'); } }, now: h.now, dispatch: async () => 0, process: async () => { throw Error('must not run'); } }).runOnce();
});
