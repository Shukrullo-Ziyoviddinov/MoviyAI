import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {ChatFailure,chatFailureCode} from '../dist/ai/types/chat-progress.types.js';

const source = readFileSync(new URL('../dist/ai/controllers/conversation.controller.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
class AiServiceError extends Error {}
function controller(work) {
  class ConversationError extends Error {}
  return new Function('ChatFailure','chatFailureCode','z', 'service', 'AiServiceError', 'setInterval', 'clearInterval', source + '\nreturn send;')
    (ChatFailure,chatFailureCode,z, { sendConversationMessage: work, ConversationError }, AiServiceError, setInterval, clearInterval);
}
function response() {
  const result = { statusCode: 0, headers: {}, writes: [], ended: false, flushed: false,
    status(value) { this.statusCode = value; return this; },
    set(value) { Object.assign(this.headers, value); return this; },
    flushHeaders() { this.flushed = true; },
    write(value) { this.writes.push(value); },
    once(_event, callback) { this.onClose = callback; },
    end() { this.ended = true; this.onClose?.(); },
    json(value) { this.jsonValue = value; },
  };
  return result;
}
const request = () => ({ userId: 'alice', params: { id: randomUUID() },
  body: { requestId: randomUUID(), text: 'Question' }, get: () => 'text/event-stream' });
test('SSE emits deltas before completion, then the persisted conversation', async () => {
  const res = response(); let saved = false;
  const send = controller(async (owner, id, requestId, text, delta) => {
    assert.equal(owner, 'alice'); assert.equal(text, 'Question'); assert.ok(res.flushed);
    delta('Sa'); delta('lom'); assert.equal(saved, false);
    saved = true; return { id, turns: [{ requestId, answer: 'Salom' }] };
  });
  await send(request(), res);
  assert.match(res.headers['Content-Type'], /text\/event-stream/);
  assert.match(res.headers['Cache-Control'], /no-transform/);
  const events = res.writes.map(line => JSON.parse(line.slice(6)));
  assert.deepEqual(events.map(event => event.type), ['delta', 'delta', 'done']);
  assert.equal(events[2].data.turns[0].answer, 'Salom'); assert.ok(res.ended);
});
test('provider stream failure is a safe error event and closes the response', async () => {
  const res = response();
  const send = controller(async (_owner, _id, _request, _text, delta) => { delta('Partial'); throw new AiServiceError('SECRET'); });
  await send(request(), res);
  assert.match(res.writes.at(-1), /"type":"error"/); assert.ok(!res.writes.join('').includes('SECRET')); assert.ok(res.ended);
});

test('SSE forwards actual stage callbacks and a specific safe failure code',async()=>{
 const res=response();const send=controller(async(_owner,_id,_request,_text,_delta,_images,_directImages,_directVideo,progress)=>{
  progress('analyzing_video');progress('searching');throw new ChatFailure('provider_unavailable');
 });await send(request(),res);
 const events=res.writes.map(line=>JSON.parse(line.slice(6)));assert.deepEqual(events.slice(0,2),[{type:'progress',stage:'analyzing_video'},{type:'progress',stage:'searching'}]);assert.equal(events[2].code,'provider_unavailable');assert.ok(res.ended);
});
test('invalid input is rejected before opening a stream or invoking AI', async () => {
  const res = response(), req = request(); req.body.text = '';
  await controller(async () => { throw Error('must not invoke'); })(req, res);
  assert.equal(res.statusCode, 400); assert.equal(res.flushed, false);
});
test('fake image bytes and oversized batches never reach AI', async () => {
  const send = controller(async () => { throw Error('must not invoke'); });
  let res=response(),req=request();req.files=[{mimetype:'image/png',buffer:Buffer.from('not an image')}];
  await send(req,res);assert.equal(res.statusCode,415);assert.equal(res.flushed,false);
  res=response();req=request();req.files=[{mimetype:'image/jpeg',buffer:Buffer.alloc(9*1024*1024)}];
  await send(req,res);assert.equal(res.statusCode,413);assert.equal(res.flushed,false);
});
