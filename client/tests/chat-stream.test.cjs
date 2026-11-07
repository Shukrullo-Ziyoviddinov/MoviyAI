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
