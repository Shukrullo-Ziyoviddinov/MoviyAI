const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
test('native Search uploads exact signed bytes directly to R2, with no chat session', async () => {
  const bytes = new Uint8Array(20).fill(7), requests = [];
  class File { constructor(uri) { this.uri = uri; this.type = 'image/jpeg'; } async arrayBuffer() { return bytes.buffer; } }
  const mocks = {
    'expo-file-system': { File },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digest: async (_kind, value) => { assert.ok(value instanceof Uint8Array); return new Uint8Array(32).buffer; } },
    'expo/fetch': { fetch: async (url, init) => { requests.push({ url, init }); return url.endsWith('/uploads') ? { ok: true, json: async () => ({ ok: true, data: { url: 'https://r2.test/private', headers: { 'Content-Type': 'image/jpeg' } } }) } : { ok: true }; } },
    './client': { apiBaseUrl: 'https://api.test' },
    '@/src/utils/authToken': { getAuthTokenSync: () => 'test-token' },
    '@/src/utils/storage': {}, '@/src/media/prepare-chat-video': {},
    './media-search-stream': { readMediaSearchStream: async () => ({ title: 'Result' }) },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/api/media-search.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require','exports','module', code)(name => mocks[name] ?? require(name), module.exports, module);
  const result = await module.exports.searchFromMedia({ type: 'image', uri: 'file:///frame.jpg' }, 'request-id', 'uz', new AbortController().signal, () => {});
  assert.equal(result.title, 'Result');
  assert.equal(requests[1].url, 'https://r2.test/private');
  assert.ok(requests[1].init.body instanceof Uint8Array);
  assert.deepEqual(requests[1].init.body, bytes);
  assert.equal(requests[1].init.headers['Content-Type'], 'image/jpeg');
  assert.equal(requests[2].url, 'https://api.test/api/media-search/request-id/analyze');
  assert.equal(requests.some(request => request.url.includes('/conversations')), false);
});
