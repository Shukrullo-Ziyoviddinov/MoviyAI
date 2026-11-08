const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function storage(type, broken = false) {
  const entries = new Map([['moviy.activeChat.alice', 'old-chat']]);
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/stores/web-chat-storage.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, crypto: { randomUUID: () => 'id' }, window: {
      performance: { getEntriesByType: () => [{ type }] },
      sessionStorage: { getItem: key => { if (broken) throw Error('disabled'); return entries.get(key) ?? null; }, setItem: (key, value) => entries.set(key, value) },
    } });
  return exports.webChatStorage;
}
test('new visits and back/forward navigation start blank despite a saved selection', async () => {
  for (const type of ['navigate', 'back_forward', undefined]) assert.equal(await storage(type).read('moviy.activeChat.alice'), '');
});
test('refresh restores only the current tab selection and keeps user keys separate', async () => {
  const tab = storage('reload'); assert.equal(await tab.read('moviy.activeChat.alice'), 'old-chat');
  assert.equal(await tab.read('moviy.activeChat.bob'), '');
  await tab.write('moviy.activeChat.alice', 'new-chat'); assert.equal(await tab.read('moviy.activeChat.alice'), 'new-chat');
});
test('disabled storage starts blank instead of selecting the latest conversation', async () => {
  assert.equal(await storage('reload', true).read('moviy.activeChat.alice'), '');
});
