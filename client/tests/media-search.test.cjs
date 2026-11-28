const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require','exports','module', source)(name => mocks[name] ?? require(name), module.exports, module);
  return module.exports;
}
const movie = { title: 'Example', posters: [], uzbekLinks: [] };
test('history lists, reopens and deletes saved searches without uploading or analyzing again', async () => {
  const requests = [], original = global.fetch;
  const api = load('src/api/media-search.ts', {
    './client': { apiBaseUrl: 'https://api.test', readAuthToken: () => 'owner-token' },
    './media-search-stream': {}, '@/media/prepare-chat-video': {},
  });
  global.fetch = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, json: async () => ({ ok: true, data: { movie } }) };
  };
  try {
    await api.fetchSearchHistory('cursor+/=');
    assert.deepEqual(await api.readSearchHistory('saved-id'), { movie });
    await api.deleteSearchHistory('saved-id');
    assert.deepEqual(requests.map(r => [r.url, r.init.method]), [
      ['https://api.test/api/media-search/history?cursor=cursor%2B%2F%3D', 'GET'],
      ['https://api.test/api/media-search/history/saved-id', 'GET'],
      ['https://api.test/api/media-search/history/saved-id', 'DELETE'],
    ]);
    for (const { init } of requests) {
      assert.equal(init.headers.Authorization, 'Bearer owner-token');
      assert.equal(init.cache, 'no-store');
    }
  } finally { global.fetch = original; }
});
for (const file of ['src/api/media-search-stream.ts', '../clientNative/src/api/media-search-stream.ts']) {
  test(`${file}: split chunks preserve progress and a complete result`, async () => {
    const { readMediaSearchStream } = load(file);
    const stages = [];
    const bytes = new TextEncoder().encode(`: keepalive\n\ndata: {"type":"progress","stage":"uzbek_links"}\n\ndata: ${JSON.stringify({ type: 'done', movie })}\n\n`);
    const body = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
    assert.deepEqual(await readMediaSearchStream({ ok: true, body }, stage => stages.push(stage)), movie);
    assert.deepEqual(stages, ['uzbek_links']);
  });
  test(`${file}: actual provider failures propagate and unfinished responses never become success`, async () => {
    const { readMediaSearchStream } = load(file);
    const response = line => ({ ok: true, body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(line)); controller.close(); } }) });
    await assert.rejects(readMediaSearchStream(response('data: {"type":"error","code":"provider_unavailable"}\n\n'), () => {}), error => error.failureCode === 'provider_unavailable');
    await assert.rejects(readMediaSearchStream(response(': keepalive\n\n'), () => {}), /interrupted/);
    await assert.rejects(readMediaSearchStream({ ok: false, body: null, status: 429 }, () => {}), error => error.failureCode === 'rate_limited');
  });
}
test('web Search uploads to R2 and its isolated endpoint, without opening a chat', async () => {
  const requests = [];
  const original = global.fetch;
  const file = new File([new Uint8Array(20).fill(7)], 'frame.jpg', { type: 'image/jpeg' });
  const { searchFromMedia } = load('src/api/media-search.ts', {
    './client': { apiBaseUrl: 'https://api.test', readAuthToken: () => 'test-token' },
    './media-search-stream': { readMediaSearchStream: async () => movie },
    '@/media/prepare-chat-video': {},
  });
  global.fetch = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/uploads')) return { ok: true, json: async () => ({ ok: true, data: { url: 'https://r2.test/private', headers: { 'Content-Type': 'image/jpeg' } } }) };
    return { ok: true };
  };
  try {
    assert.deepEqual(await searchFromMedia(file, 'request-id', 'uz', new AbortController().signal, () => {}), movie);
    assert.equal(requests[0].url, 'https://api.test/api/media-search/uploads');
    assert.equal(requests[1].url, 'https://r2.test/private');
    assert.equal(requests[1].init.body, file);
    assert.equal(requests[2].url, 'https://api.test/api/media-search/request-id/analyze');
    assert.equal(requests.some(request => request.url.includes('/conversations')), false);
  } finally { global.fetch = original; }
});
