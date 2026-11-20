const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
function storageHarness(initData) {
  const values = new Map([['moviy.authToken', 'google-token']]);
  const window = { Telegram: { WebApp: { initData } }, localStorage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  } };
  const module = { exports: {} };
  vm.runInNewContext(compile('api/client.ts'), { exports: module.exports, window, process: { env: {} } });
  return { api: module.exports, window, values };
}
test('Telegram session storage is isolated from ordinary Google web storage', () => {
  const h = storageHarness('signed-data');
  assert.equal(h.api.readAuthToken(), '');
  h.api.writeAuthToken('telegram-token');
  assert.equal(h.api.readAuthToken(), 'telegram-token');
  assert.equal(h.values.get('moviy.authToken'), 'google-token');
  h.api.clearAuthToken();
  assert.equal(h.values.get('moviy.authToken'), 'google-token');
  h.window.Telegram.WebApp.initData = '';
  assert.equal(h.api.readAuthToken(), 'google-token');
});
test('Telegram authentication works when WebView disk storage is blocked', () => {
  const h = storageHarness('signed-data');
  h.window.localStorage.getItem = h.window.localStorage.setItem = h.window.localStorage.removeItem = () => { throw Error('Storage disabled'); };
  h.api.writeAuthToken('verified-token');
  assert.equal(h.api.readAuthToken(), 'verified-token');
  h.api.clearAuthToken();
  assert.equal(h.api.readAuthToken(), '');
});

function authHarness(initData, login) {
  const h = storageHarness(initData), states = [], effects = [];
  let cursor = 0, meCalls = 0;
  const react = {
    createContext: () => ({ Provider: 'provider' }), useContext: () => {},
    useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect: effect => effects.push(effect),
  };
  class AuthRequestError extends Error {}
  const module = { exports: {} };
  vm.runInNewContext(compile('components/auth/auth-state.tsx'), {
    exports: module.exports, process: { env: {} }, window: h.window, AbortController, AbortSignal,
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === '@/api/client') return h.api;
      if (name === '@/api/auth') return { AuthRequestError, loginWithTelegram: login,
        fetchAuthMe: async () => { meCalls++; return { profile: { id: 'google', email: 'g@example.org' } }; } };
      if (name === './TelegramAuthNotice') return { TelegramAuthNotice: 'notice' };
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  function render() { cursor = 0; effects.length = 0; return module.exports.AuthProvider({ children: 'children' }); }
  render();
  return { ...h, run: () => effects[0](), render, meCalls: () => meCalls };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('Mini App authenticates signed initData before exposing an account and does not reuse Google cache', async () => {
  let resolve;
  const h = authHarness('signed-data', data => { assert.equal(data, 'signed-data'); return new Promise(done => { resolve = done; }); });
  const cleanup = h.run();
  await tick();
  assert.equal(h.render().props.value.profile, null);
  assert.equal(h.meCalls(), 0);
  resolve({ token: 'tg-token', profile: { id: 'tg', telegramId: '123', email: '', name: 'Ali' } });
  await tick();
  const auth = h.render().props.value;
  assert.equal(auth.profile.id, 'tg'); assert.equal(auth.ready, true); assert.equal(auth.busy, false);
  assert.equal(h.api.readAuthToken(), 'tg-token');
  assert.equal(h.values.get('moviy.authToken'), 'google-token');
  cleanup();
});
test('Telegram auth failure exposes retry without opening Google sign-in or using an old token', async () => {
  const h = authHarness('signed-data', async () => { throw Error('Invalid signature'); });
  const cleanup = h.run(); await tick();
  const tree = h.render(), auth = tree.props.value;
  assert.equal(auth.profile, null); assert.equal(auth.modalOpen, false);
  assert.equal(h.api.readAuthToken(), '');
  assert.equal(tree.props.children[1].type, 'notice');
  auth.requireAuth();
  assert.equal(h.render().props.value.modalOpen, false);
  cleanup();
});
test('an abandoned Telegram login cannot restore a stale account after cleanup', async () => {
  let resolve;
  const h = authHarness('signed-data', () => new Promise(done => { resolve = done; }));
  const cleanup = h.run();
  await tick();
  cleanup();
  resolve({ token: 'stale-token', profile: { id: 'stale', telegramId: '123' } });
  await tick();
  assert.equal(h.api.readAuthToken(), '');
  assert.equal(h.render().props.value.profile, null);
});
