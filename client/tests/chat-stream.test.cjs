const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/' + file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, TextDecoder, setTimeout, clearTimeout, ...globals });
  return exports;
}
const { consumeChatStream } = load('api/chat-stream.ts');
test('native and web share the stream parser and text reveal behavior', () => {
  for (const file of ['api/chat-stream.ts', 'stores/text-reveal.ts']) {
    assert.equal(fs.readFileSync(path.join(__dirname, '../src/' + file), 'utf8'),
      fs.readFileSync(path.join(__dirname, '../../clientNative/src/' + file), 'utf8'));
  }
});

test('all progress and failure labels exist in Uzbek, Russian and English on both clients',()=>{
 const stages=['upload_video','upload_image','analyzing_video','analyzing_image','verifying','catalog','searching','uzbek_links','posters','preparing'];
 const failures=['insufficient_evidence','identity_unconfirmed','provider_unavailable','search_unavailable','rate_limited','timeout','video_unreadable','upload_failed','unknown'];
 for(const language of ['uz','ru','en']){
  const web=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/i18n/locales/'+language+'.json'),'utf8')).chat;
  const native=JSON.parse(fs.readFileSync(path.join(__dirname,'../../clientNative/src/i18n/locales/'+language+'.json'),'utf8')).chat;
  for(const [group,keys] of [['progress',stages],['failures',failures]])for(const key of keys){assert.ok(web[group][key]?.trim());assert.equal(web[group][key],native[group][key]);}
 }
});
function response(text, size = 3) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0, released = false;
  return { ok: true, body: { getReader: () => ({
    read: async () => offset >= bytes.length ? { done: true } : { done: false, value: bytes.slice(offset, offset += size) },
    releaseLock: () => { released = true; },
  }) }, released: () => released };
}
test('stream parses fragmented UTF-8, heartbeats, deltas and saved result', async () => {
  const reply = { id: 'chat', turns: [] };
  const input = response(': keepalive\n\ndata: {"type":"delta","text":"Salom 🎬"}\n\ndata: ' + JSON.stringify({ type: 'done', data: reply }) + '\n\n');
  let text = ''; const result = await consumeChatStream(input, delta => { text += delta; });
  assert.equal(text, 'Salom 🎬'); assert.equal(result.id, reply.id); assert.ok(input.released());
});
test('stream errors and premature disconnect are not mistaken for completed answers', async () => {
  for (const text of ['data: {"type":"error"}\n\n', 'data: {"type":"delta","text":"Partial"}\n\n']) {
    const input = response(text); await assert.rejects(() => consumeChatStream(input, () => {})); assert.ok(input.released());
  }
});

test('real progress stages cross fragmented SSE without becoming answer text',async()=>{
 const stages=[],deltas=[];const input=response('data: {"type":"progress","stage":"analyzing_video"}\n\ndata: {"type":"progress","stage":"invented"}\n\ndata: {"type":"progress","stage":"searching"}\n\ndata: {"type":"delta","text":"Result"}\n\ndata: {"type":"done","data":{"id":"chat","turns":[]}}\n\n',2);
 await consumeChatStream(input,text=>deltas.push(text),stage=>stages.push(stage));assert.deepEqual(stages,['analyzing_video','searching']);assert.deepEqual(deltas,['Result']);
});
test('SSE failures preserve whitelisted cause codes and ignore arbitrary error text',async()=>{
 for(const [code,expected] of [['video_unreadable','video_unreadable'],['timeout','timeout'],['invented','unknown']]){
  const input=response('data: '+JSON.stringify({type:'error',code,message:'SECRET'})+'\n\n');
  await assert.rejects(()=>consumeChatStream(input,()=>{}),error=>error.failureCode===expected&&!error.message.includes('SECRET'));
 }
});
test('text reveal is progressive, preserves emoji, and drains before completion', async () => {
  const frames = [], scheduled = [];
  const { createTextReveal } = load('stores/text-reveal.ts', { setTimeout: fn => { scheduled.push(fn); return scheduled.length; }, clearTimeout: () => {} });
  const reveal = createTextReveal(text => frames.push(text), () => true);
  reveal.push('Salom 🎬 kino olami'); let done = false; const completion = reveal.finish().then(() => { done = true; });
  assert.equal(frames.length, 0);
  scheduled.shift()(); assert.ok(frames[0].length < 'Salom 🎬 kino olami'.length); assert.equal(done, false);
  while (scheduled.length) scheduled.shift()(); await completion;
  assert.equal(frames.at(-1), 'Salom 🎬 kino olami');
});
test('cancelled reveal cannot display text from an old conversation', async () => {
  const frames = [], scheduled = [];
  const { createTextReveal } = load('stores/text-reveal.ts', { setTimeout: fn => { scheduled.push(fn); return 1; }, clearTimeout: () => {} });
  const reveal = createTextReveal(text => frames.push(text), () => false);
  reveal.push('Private answer'); const done = reveal.finish(); scheduled.shift()(); await done;
  assert.equal(frames.length, 0);
});
