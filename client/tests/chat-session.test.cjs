const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/stores/chat-session.ts'), 'utf8');
const nativeSource = fs.readFileSync(path.join(__dirname, '../../clientNative/src/stores/chat-session.ts'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const db = new Map(), storage = new Map();
  let id = 0, fail = false, calls = 0, hold, deltas = [];
  const copy = value => JSON.parse(JSON.stringify(value));
  const api = {
    listChats: async () => [...db.values()].map(({ turns, ...chat }) => copy(chat)),
    createChat: async id => {
      if (!db.has(id)) db.set(id, { id, title: 'Yangi chat', updatedAt: new Date().toISOString(), turns: [] });
      return copy(db.get(id));
    },
    getChat: async id => {
      if (!db.has(id)) throw Error('not found');
      return copy(db.get(id));
    },
    sendChat: async (id, requestId, text, onDelta) => {
      calls++;
      const chat = db.get(id);
      let turn = chat.turns.find(turn => turn.requestId === requestId);
      if (!turn) { turn = { requestId, text, answer: '', status: 'processing', createdAt: new Date().toISOString() }; chat.turns.push(turn); }
      chat.title = text;
      for (const delta of deltas) onDelta(delta);
      if (hold) await hold;
      if (fail) { turn.status = 'failed'; throw Error('provider failed'); }
      turn.status = 'completed'; turn.answer = 'Answer'; return copy(chat);
    },
  };
  const exports = {};
  const revealExports = {};
  const revealSource = fs.readFileSync(path.join(__dirname, '../src/stores/text-reveal.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(revealSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: revealExports, setTimeout, clearTimeout });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => name.includes('text-reveal') ? revealExports : api, Date, setTimeout, clearTimeout });
  const create = () => exports.createChatSession({ read: async key => storage.get(key) ?? null,
    write: async (key, value) => { storage.set(key, value); }, uuid: () => `id-${++id}` });
  return { create, db, storage, api, fail: value => { fail = value; }, hold: value => { hold = value; }, deltas: value => { deltas = value; }, calls: () => calls };
}

test('web and native use identical session behavior', () => assert.equal(source, nativeSource));
test('send, refresh, new chat, and reopening preserve messages', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  session.actions.sendMessage({ text: 'First chat' }); await tick();
  const id = session.getState().activeId;
  assert.equal(session.getState().messages.length, 2);
  assert.equal(session.getState().conversations[0].title, 'First chat');
  const restored = h.create(); await restored.actions.initialize('alice');
  assert.equal(restored.getState().activeId, id); assert.equal(restored.getState().messages.length, 2);
  restored.actions.newChat(); assert.equal(restored.getState().messages.length, 0);
  const blank = h.create(); await blank.actions.initialize('alice');
  assert.equal(blank.getState().activeId, null);
  await blank.actions.openChat(id); assert.equal(blank.getState().messages.length, 2);
});
test('failed turn survives refresh and retry reuses the request ID', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice'); h.fail(true);
  session.actions.sendMessage({ text: 'Question' }); await tick();
  const pending = session.getState().pending; assert.ok(pending); assert.equal(session.getState().messages.length, 1);
  const restored = h.create(); await restored.actions.initialize('alice');
  assert.equal(restored.getState().pending.requestId, pending.requestId);
  h.fail(false); restored.actions.retry(); restored.actions.retry(); await tick();
  assert.equal(h.calls(), 2); assert.equal(h.db.get(pending.conversationId).turns.length, 1);
  assert.equal(restored.getState().messages.length, 2); assert.equal(restored.getState().pending, null);
});
test('logout clears memory and ignores a response from the old account', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  let release; h.hold(new Promise(resolve => { release = resolve; }));
  session.actions.sendMessage({ text: 'Private' }); await tick();
  await session.actions.initialize(null); release(); await tick();
  assert.equal(session.getState().owner, null); assert.equal(session.getState().messages.length, 0);
  assert.equal(session.getState().conversations.length, 0);
});
test('latest selected conversation wins out-of-order responses', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  await h.api.createChat('a'); await h.api.createChat('b');
  const get = h.api.getChat; let release;
  h.api.getChat = async id => { if (id === 'a') await new Promise(resolve => { release = resolve; }); return get(id); };
  const first = session.actions.openChat('a'); await tick(); await session.actions.openChat('b'); release(); await first;
  assert.equal(session.getState().activeId, 'b');
});
test('live text is visible while sending and is replaced once by the saved answer', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  h.deltas(['Ans', 'wer']); let release; h.hold(new Promise(resolve => { release = resolve; }));
  session.actions.sendMessage({ text: 'Question' });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(session.getState().streamingText, 'Answer'); assert.equal(session.getState().sending, true);
  assert.equal(session.getState().messages.length, 1);
  release(); await tick();
  assert.equal(session.getState().streamingText, ''); assert.equal(session.getState().messages.length, 2);
  assert.equal(session.getState().messages[1].text, 'Answer'); assert.equal(session.getState().sending, false);
});
