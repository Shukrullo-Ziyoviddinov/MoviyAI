import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../dist/ai/services/google-ai.service.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function harness(work, onWait) {
  const controller = new AbortController(), delays = [], signals = [];
  let calls = 0;
  const execute = async (mode, params) => { signals.push(params.config.abortSignal); return work(mode, ++calls); };
  class GoogleGenAI {
    models = { generateContent: params => execute('normal', params), generateContentStream: params => execute('stream', params) };
  }
  const deps = {
    GoogleGenAI, AI_CONFIG: { apiKey: 'test-only-key' },
    operationSignal: () => controller.signal,
    checkpointKey: () => 'test', chatCheckpoint: (_key, run) => run(),
    PROVIDER_RETRY_DELAYS: [2000, 5000],
    waitForProviderRetry: async (delay, signal) => { delays.push(delay); onWait?.(controller); signal.throwIfAborted(); },
  };
  const service = new Function(...Object.keys(deps), `${source}\nreturn {generateAiResponse};`)(...Object.values(deps));
  return { ...service, controller, delays, signals, calls: () => calls };
}
const failure = status => Object.assign(Error('Private provider detail must not escape'), { status });

test('temporary text-provider failures retry with 2s and 5s delays using the same deadline', async () => {
  const h = harness((_mode, attempt) => { if (attempt < 3) throw failure(503); return { text: 'Answer' }; });
  const result = await h.generateAiResponse('same-model', [], 'policy');
  assert.equal(result.text, 'Answer'); assert.equal(result.model, 'same-model'); assert.equal(h.calls(), 3);
  assert.deepEqual(h.delays, [2000, 5000]);
  assert.ok(h.signals.every(signal => signal === h.controller.signal));
});
test('exhausted temporary failures stop after three calls and keep the sanitized provider status', async () => {
  const h = harness(() => { throw failure(503); });
  await assert.rejects(() => h.generateAiResponse('same-model', [], 'policy'), error => error.name === 'AiServiceError' && error.status === 503 && !error.message.includes('Private'));
  assert.equal(h.calls(), 3); assert.deepEqual(h.delays, [2000, 5000]);
});
test('authentication, invalid requests and quota failures are not blindly repeated', async () => {
  for (const status of [400, 401, 403, 429]) {
    const h = harness(() => { throw failure(status); });
    await assert.rejects(() => h.generateAiResponse('same-model', [], 'policy'), error => error.status === status);
    assert.equal(h.calls(), 1); assert.deepEqual(h.delays, []);
  }
});
test('a failed stream opening retries before any text is emitted', async () => {
  const received = [];
  const h = harness((_mode, attempt) => {
    if (attempt === 1) throw failure(503);
    return (async function* () { yield { text: 'Salom!' }; })();
  });
  const result = await h.generateAiResponse('same-model', [], 'policy', text => received.push(text));
  assert.equal(result.text, 'Salom!'); assert.deepEqual(received, ['Salom!']); assert.equal(h.calls(), 2);
});
test('a stream failing after visible text does not duplicate its prefix', async () => {
  const received = [];
  const h = harness(() => (async function* () { yield { text: 'Already visible' }; throw failure(503); })());
  await assert.rejects(() => h.generateAiResponse('same-model', [], 'policy', text => received.push(text)), error => error.status === 503);
  assert.deepEqual(received, ['Already visible']); assert.equal(h.calls(), 1); assert.deepEqual(h.delays, []);
});
test('cancelling during backoff prevents another model call', async () => {
  const h = harness(() => { throw failure(503); }, controller => controller.abort(new Error('Stopped by user')));
  await assert.rejects(() => h.generateAiResponse('same-model', [], 'policy'), /Stopped by user/);
  assert.equal(h.calls(), 1);
});
