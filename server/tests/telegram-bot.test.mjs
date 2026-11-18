import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual, randomUUID, randomBytes } from 'node:crypto';
import { Readable, PassThrough, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { formatTelegramText, entitiesForChunk } from '../dist/bot/format.js';

// Isolated dependencies: no production Telegram, Gemini, R2 or database calls.
function load(name, deps, names) {
  const source = readFileSync(new URL(`../dist/bot/${name}.js`, import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  return new Function(...Object.keys(deps), `${source}\nreturn {${names.join(',')}};`)(...Object.values(deps));
}
const env = { telegramBotToken: 'test-only-token', telegramWebAppUrl: 'https://example.com/', publicUrl: 'https://api.example.com' };
test('ordinary bot text uses the same streaming model transport as web and returns one completed answer', async () => {
  let streamed = false;
  const { answerBot } = load('ai', {
    isContextMovieFollowup: () => false, isMovieRecommendation: () => false, isNamedMovieSearch: () => false,
    chatWithGemma: async (request, onDelta) => {
      assert.equal(request.text, 'Salom'); assert.equal(typeof onDelta, 'function');
      onDelta('Salom!'); onDelta(' Qanday kino izlayapsiz?'); streamed = true;
      return { text: 'Salom! Qanday kino izlayapsiz?', model: 'same-chat-model' };
    },
  }, ['answerBot']);
  const result = await answerBot('Salom', [], []);
  assert.equal(streamed, true); assert.equal(result.text, 'Salom! Qanday kino izlayapsiz?');
  assert.equal(result.model, 'same-chat-model'); assert.deepEqual(result.characterImages, []);
});
test('long ordinary answers remain complete and emoji are not split across Telegram messages', () => {
  const { splitTelegramText } = load('api', {}, ['splitTelegramText']);
  const text = 'x'.repeat(3999) + '🎬' + 'y'.repeat(5000);
  const parts = splitTelegramText(text);
  assert.equal(parts.join(''), text);
  assert.equal(parts.every(part => part.length <= 4000 && !/[\uD800-\uDBFF]$/.test(part) && !/^[\uDC00-\uDFFF]/.test(part)), true);
});
test('only Telegram result-only turns allow an empty user prompt', async () => {
  const { ChatTurn } = await import('../dist/ai/models/conversation.model.js');
  const fields = { conversationId: 'test', userId: 'test', requestId: 'test', status: 'completed', text: '' };
  await new ChatTurn({ ...fields, origin: 'telegram' }).validate();
  await assert.rejects(() => new ChatTurn({ ...fields, origin: 'ui' }).validate(), /text/);
});
const security = load('security', { createHmac, timingSafeEqual, env }, ['telegramUser', 'webhookSecret', 'validWebhook', 'mediaSignature', 'validMediaSignature']);
function initData(id, date = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ user: JSON.stringify({ id }), auth_date: String(date), query_id: 'test' });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(env.telegramBotToken).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}
test('Telegram identity is signed, fresh, unique and cannot be forged by editing user id', () => {
  assert.equal(security.telegramUser(initData(123)), '123');
  assert.equal(security.telegramUser(initData(123).replace('123', '456')), null);
  assert.equal(security.telegramUser(initData(123, Math.floor(Date.now() / 1000) - 3601)), null);
  assert.equal(security.telegramUser(initData(123) + '&user=duplicate'), null);
  assert.equal(security.telegramUser(initData(-1)), null);
  assert.equal(security.validWebhook('invalid'), false);
  assert.equal(security.validWebhook('é'.repeat(64)), false);
  assert.equal(security.validWebhook(security.webhookSecret()), true);
});
test('media links expire, bind to exactly one update, and contain no bot token', async () => {
  let stored;
  const { telegramMedia } = load('media', { env, mediaSignature: security.mediaSignature, BotUpdate: { updateOne: async (_query, update) => { stored = update.$set.media; } } }, ['telegramMedia']);
  const [media] = await telegramMedia('42', { message: { video: { file_id: 'telegram-file', file_size: 3000, duration: 40 } } });
  assert.equal(stored.fileId, 'telegram-file');
  const url = new URL(media.fileUri);
  assert.equal(url.hostname, 'api.example.com');
  assert.equal(media.fileUri.includes(env.telegramBotToken), false);
  assert.equal(media.fileUri.includes('telegram-file'), false);
  const expires = url.searchParams.get('expires'), signature = url.searchParams.get('signature');
  assert.equal(security.validMediaSignature('42', expires, signature), true);
  assert.equal(security.validMediaSignature('43', expires, signature), false);
  assert.equal(security.validMediaSignature('42', String(Date.now() - 1), signature), false);
});
test('Telegram media limits are enforced before fetching or analyzing', () => {
  const { selectMedia } = load('media', {}, ['selectMedia']);
  assert.throws(() => selectMedia({ message: { video: { duration: 181, file_id: 'x' } } }), /DURATION/);
  assert.throws(() => selectMedia({ message: { video: { duration: 60, file_size: 21 * 1024 * 1024, file_id: 'x' } } }), /TOO_LARGE/);
  assert.throws(() => selectMedia({ message: { document: { mime_type: 'video/invalid', duration: 10, file_id: 'x' } } }), /FORMAT/);
  assert.equal(selectMedia({ message: { photo: [{ file_id: 'small' }, { file_id: 'large' }] } }).fileId, 'large');
});
const { botPresentation } = load('presentation', { env }, ['botPresentation']);
test('ordinary conversation and real source buttons stay in Telegram; rich results open Mini App', () => {
  const plain = botPresentation({ text: 'Salom! [Manba](https://example.org/film)', model: 'test' }, 'a'.repeat(64));
  assert.equal(plain.rich, false);
  assert.equal(plain.buttons[0][0].url, 'https://example.org/film');
  const rich = botPresentation({ text: 'Private answer', movie: { title: 'Film' } }, 'b'.repeat(64));
  assert.equal(rich.rich, true);
  assert.equal(rich.text.includes('Private answer'), false);
  assert.equal(new URL(rich.buttons[0][0].web_app.url).searchParams.get('telegramResult'), 'b'.repeat(64));
  assert.equal(botPresentation({ text: 'Actor', rich: true }, 'c'.repeat(64)).rich, true);
  const sources = botPresentation({ text: 'Details', movie: { title: 'Film' }, telegramSources: [{ title: 'Source', url: 'https://example.org' }] }, 'd'.repeat(64));
  assert.equal(sources.rich, false);
  assert.equal(sources.buttons[0][0].url, 'https://example.org/');
});
test('publishing copies only AI result, never Telegram prompts or media, with idempotent turn key', async () => {
  const writes = [];
  const job = { _id: '1', conversationId: 'conversation', createdAt: new Date(), telegramId: '123', notification: { rich: true },
    update: { message: { text: 'PRIVATE PROMPT', video: { file_id: 'PRIVATE FILE' } } },
    result: { text: 'Film answer', model: 'test', movie: { title: 'Film' } } };
  const { publishResult } = load('results', {
    BotUpdate: { findById: () => ({ lean: async () => job }), updateOne: async () => {} },
    Conversation: { findById: () => ({ lean: async () => null }), updateOne: async (...args) => { writes.push(args); } },
    ChatTurn: { updateOne: async (...args) => { writes.push(args); } }, wakeCatalogWorker: () => {},
  }, ['publishResult']);
  assert.equal(await publishResult('1', 'owner'), 'conversation');
  const turn = writes[1][1].$setOnInsert;
  assert.equal(turn.text, '');
  assert.deepEqual(turn.images, []); assert.deepEqual(turn.videos, []);
  assert.equal(turn.answer, 'Film answer');
  assert.equal(JSON.stringify(writes).includes('PRIVATE'), false);
  assert.equal(writes[1][0].requestId, 'telegram-1');
});
test('a result cannot be claimed by a different Telegram identity or rebound to another account', async () => {
  let published = false;
  const { claimResult } = load('results', {
    telegramUser: security.telegramUser,
    BotUpdate: { findOne: query => ({ lean: async () => query.telegramId === '123' ? { _id: '1', result: {}, notification: { rich: true } } : null }) },
    BotSession: { findOneAndUpdate: async () => null },
    Conversation: {}, ChatTurn: {}, wakeCatalogWorker: () => { published = true; },
  }, ['claimResult']);
  await assert.rejects(() => claimResult('account', 'a'.repeat(64), initData(999)), /RESULT_NOT_FOUND/);
  await assert.rejects(() => claimResult('other-account', 'a'.repeat(64), initData(123)), /RESULT_FORBIDDEN/);
  assert.equal(published, false);
});

function workerHarness(options = {}) {
  let aiCalls = 0, sendCalls = 0;
  const job = { _id: '42', telegramId: '123', status: 'pending', nextAttemptAt: new Date(0), resultToken: 'a'.repeat(64),
    createdAt: new Date(), conversationId: 'unused', update: { update_id: 42, message: { message_id: 7, text: 'salom', ...(options.video ? { video: options.video } : {}) } } };
  const session = { _id: '123', conversationId: 'bot-thread', profileId: options.profileId ?? null, history: [], movie: options.previousMovie ?? null };
  const updates = {
    findOneAndUpdate: (_query, update) => ({ lean: async () => {
      if (['sent', 'failed'].includes(job.status) || job.nextAttemptAt > new Date()) return null;
      Object.assign(job, update.$set); return { ...job };
    } }),
    updateOne: async (_query, update) => { Object.assign(job, update.$set); return { matchedCount: 1 }; },
    findById: () => ({ lean: async () => ({ ...job }) }),
    exists: async query => query.lockToken ? true : options.earlier && query['update.message.message_id']?.$lt === 7,
  };
  const sessions = {
    findOneAndUpdate: (_query, update) => ({ lean: async () => { Object.assign(session, update.$set); return { ...session }; } }),
    updateOne: async (_query, update) => { Object.assign(session, update.$set); return { matchedCount: 1 }; },
  };
  const worker = load('worker', {
    randomUUID, randomBytes, BotUpdate: updates, BotSession: sessions,
    Conversation: { exists: async () => false },
    answerBot: async (_text, _media, _history, _movie, onProgress) => {
      aiCalls++; onProgress?.('analyzing_video'); onProgress?.('searching');
      if (options.answerError) throw options.answerError;
      return options.result ?? { text: 'Salom! Qanday kino izlayapsiz?', model: 'test' };
    },
    botPresentation, telegramMedia: async () => [],
    runChatOperation: async (_context, work) => work(), ChatFailure: Error, chatFailureCode: error => error?.failureCode ?? 'unknown',
    createBotProgress: (_id, progressOptions) => ({
      start: async stage => { options.onProgressOptions?.(progressOptions); options.events?.push(['start', stage]); await progressOptions.save(99); },
      report: stage => { options.events?.push(['stage', stage]); },
      finish: async text => { options.events?.push(['finish', text]); },
      remove: async () => { options.events?.push(['remove']); },
      dispose: () => { options.events?.push(['dispose']); },
    }),
    isCatalogEligible: movie => !!movie?.title, drainBotCatalog: () => { options.onCatalog?.(); return Promise.resolve(); },
    TelegramError,
    publishResult: options.publishResult ?? (async () => { throw Error('Ordinary chat must not publish UI history'); }),
    sendTelegramMessage: async () => { if (++sendCalls === 1 && options.fail !== false) throw options.fail ?? Error('Simulated Telegram outage'); },
  }, ['drainBotQueue']);
  return { worker, job, session, aiCalls: () => aiCalls, sendCalls: () => sendCalls };
}
const { TelegramError } = load('api', {}, ['TelegramError']);
test('delivery retries reuse a durable AI answer and do not duplicate private conversation history', async () => {
  const { worker, job, session, aiCalls, sendCalls } = workerHarness();
  await worker.drainBotQueue();
  assert.equal(aiCalls(), 1); assert.equal(job.status, 'ready');
  job.nextAttemptAt = new Date(0);
  await worker.drainBotQueue();
  assert.equal(aiCalls(), 1); assert.equal(sendCalls(), 2); assert.equal(job.status, 'sent');
  assert.equal(session.history.length, 2);
  assert.equal(job.conversationId, 'bot-thread');
});

test('a permanently rejected Telegram delivery ends without blocking the next user requests', async () => {
  const h = workerHarness({ fail: new TelegramError(403) });
  await h.worker.drainBotQueue();
  assert.equal(h.job.status, 'failed');
  assert.equal(h.aiCalls(), 1); assert.equal(h.sendCalls(), 1);
});
test('Telegram rate limit delay is respected without repeating movie analysis', async () => {
  const h = workerHarness({ fail: new TelegramError(429, 90) });
  const before = Date.now();
  await h.worker.drainBotQueue();
  assert.equal(h.job.status, 'ready');
  assert.ok(h.job.nextAttemptAt.getTime() >= before + 90000);
  assert.equal(h.aiCalls(), 1);
});
test('catalog dispatch is durable and never awaited before sending the result button', async () => {
  let dispatched = 0;
  const h = workerHarness({ fail: false, result: { text: 'Film answer', model: 'test', movie: { title: 'Film' } }, onCatalog: () => { dispatched++; } });
  await h.worker.drainBotQueue();
  assert.equal(h.job.status, 'sent');
  assert.equal(h.job.catalogPending, true);
  assert.equal(h.job.notification.rich, true);
  assert.equal(dispatched, 1);
});
test('catalog failure retries independently and watch-link followups update the catalog', async () => {
  let calls = 0, links = 0;
  const job = { _id: '42', catalogPending: true, catalogAttempts: 0, catalogNextAttemptAt: new Date(0), status: 'sent',
    result: { text: 'Film', movie: { title: 'Film' } } };
  const ids = [];
  const catalog = load('catalog', {
    BotUpdate: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => job.catalogPending && job.catalogNextAttemptAt <= new Date() ? [{ ...job }] : [] }) }) }),
      updateOne: async (_query, update) => { Object.assign(job, update.$set); },
    },
    CatalogSaveJob: { updateOne: async query => { ids.push(query._id); if (++calls === 1) throw Error('Temporary database problem'); } },
    isCatalogEligible: movie => !movie.linksOnly, catalogChatInput: movie => ({ movie }),
    saveCatalogWatchLinks: async () => { links++; }, wakeCatalogWorker: () => {},
  }, ['drainBotCatalog']);
  await catalog.drainBotCatalog();
  assert.equal(job.status, 'sent'); assert.equal(job.catalogPending, true); assert.equal(job.catalogAttempts, 1);
  job.catalogNextAttemptAt = new Date(0);
  await catalog.drainBotCatalog();
  assert.equal(job.catalogPending, false); assert.equal(ids[0], ids[1]);
  job.catalogPending = true; job.result.movie.linksOnly = true;
  await catalog.drainBotCatalog();
  assert.equal(links, 1); assert.equal(job.catalogPending, false);
});

test('temporary UI publication failure still delivers a persisted rich-result button', async () => {
  let calls = 0;
  const h = workerHarness({ fail: false, profileId: 'owner', result: { text: 'Film', model: 'test', movie: { title: 'Film' } },
    publishResult: async () => { calls++; throw Error('Temporary UI database problem'); } });
  await h.worker.drainBotQueue();
  assert.equal(calls, 1); assert.equal(h.job.status, 'sent'); assert.equal(h.job.notification.rich, true);
  assert.equal(h.job.result.movie.title, 'Film');
});
test('multiple recommendations clear an older movie identity and preserve every recommended title', async () => {
  const h = workerHarness({ fail: false, previousMovie: { title: 'Old film' }, result: { text: 'Recommendations', model: 'test',
    recommendations: [{ text: 'First', movie: { title: 'New one', year: 2000 } }, { text: 'Second', movie: { title: 'New two', year: 2010 } }] } });
  await h.worker.drainBotQueue();
  assert.equal(h.session.movie, null);
  assert.match(h.session.history.at(-1).text, /New one.*New two/);
});
test('partial delivery retries send only remaining text chunks after Telegram rate limiting', async () => {
  const bodies = [];
  let cursor = 0;
  const api = load('api', { env, formatTelegramText, entitiesForChunk, axios: {
    post: async (_url, body) => {
      bodies.push(body);
      return bodies.length === 2 ? { data: { ok: false, error_code: 429, parameters: { retry_after: 45 } } }
        : { data: { ok: true, result: { message_id: bodies.length } } };
    }, isAxiosError: () => false,
  } }, ['sendTelegramMessage']);
  const text = 'a'.repeat(4000) + 'remaining';
  await assert.rejects(() => api.sendTelegramMessage(123, text, [], { onSent: async value => { cursor = value; } }), error => error.status === 429 && error.retryAfter === 45);
  assert.equal(cursor, 1);
  await api.sendTelegramMessage(123, text, [], { start: cursor, onSent: async value => { cursor = value; } });
  assert.equal(cursor, 2);
  assert.deepEqual(bodies.map(body => body.text.length), [4000, 9, 9]);
});

test('an earlier Telegram message accepted later still runs before a newer queued message', async () => {
  const h = workerHarness({ fail: false, earlier: true });
  await h.worker.drainBotQueue();
  assert.equal(h.aiCalls(), 0); assert.equal(h.sendCalls(), 0);
  assert.equal(h.job.status, 'pending');
  assert.ok(h.job.nextAttemptAt > new Date());
});
test('concurrent result opens tolerate only verified duplicate writes for the same owner', async () => {
  const duplicate = Object.assign(Error('Duplicate key'), { code: 11000 });
  let marked = false;
  const deps = {
    BotUpdate: { findById: () => ({ lean: async () => ({ _id: '42', conversationId: 'thread', result: { text: 'Film', model: 'test' }, notification: { rich: true } }) }),
      updateOne: async () => { marked = true; } },
    Conversation: { findById: () => ({ lean: async () => null }), updateOne: async () => { throw duplicate; }, exists: async query => query.userId === 'owner' },
    ChatTurn: { updateOne: async () => { throw duplicate; }, exists: async query => query.userId === 'owner' },
    wakeCatalogWorker: () => {},
  };
  const { publishResult } = load('results', deps, ['publishResult']);
  assert.equal(await publishResult('42', 'owner'), 'thread'); assert.equal(marked, true);
  await assert.rejects(() => publishResult('42', 'other'), /Duplicate key/);
});
function response() {
  const stream = new PassThrough();
  stream.headers = {}; stream.statusCode = 200; stream.body = [];
  stream.on('data', chunk => stream.body.push(chunk));
  stream.status = code => { stream.statusCode = code; return stream; };
  stream.set = (name, value) => { stream.headers[name.toLowerCase()] = value; return stream; };
  stream.setHeader = stream.set;
  stream.sendStatus = code => { stream.status(code); stream.end(); };
  return stream;
}
function relayHarness({ method = 'GET', range, status = 206, length = 4 } = {}) {
  let config, reads = 0;
  const upstream = new Readable({ read() { reads++; this.push('tail'); this.push(null); } });
  const service = load('media', {
    env, Transform, pipeline,
    validMediaSignature: () => true,
    BotUpdate: { findById: () => ({ lean: async () => ({ media: { mimeType: 'video/mp4', fileId: 'private-file' } }) }) },
    telegram: async () => ({ file_path: 'videos/clip.mp4', file_size: 100 }),
    axios: { request: async value => { config = value; return { status, data: upstream, headers: { 'content-length': length, 'content-range': status === 416 ? 'bytes */100' : 'bytes 96-99/100' } }; } },
  }, ['relayMedia']);
  const req = { method, params: { id: '42' }, query: {}, header: name => name === 'range' ? range : undefined };
  const res = response();
  return { run: () => service.relayMedia(req, res), res, config: () => config, reads: () => reads, upstream };
}
test('video suffix ranges stream the exact requested part without writing to storage', async () => {
  const h = relayHarness({ range: 'bytes=-4' });
  await h.run();
  assert.equal(h.config().headers.Range, 'bytes=-4');
  assert.equal(h.res.statusCode, 206);
  assert.equal(Buffer.concat(h.res.body).toString(), 'tail');
  assert.equal(h.res.headers['content-range'], 'bytes 96-99/100');
});
test('HEAD checks media headers without downloading video bytes; oversized responses are rejected early', async () => {
  const head = relayHarness({ method: 'HEAD', status: 200 });
  await head.run();
  assert.equal(head.config().method, 'HEAD'); assert.equal(head.reads(), 0); assert.equal(head.upstream.destroyed, true);
  const large = relayHarness({ length: 21 * 1024 * 1024 });
  await large.run();
  assert.equal(large.res.statusCode, 413); assert.equal(large.reads(), 0);
  const invalid = relayHarness({ range: 'bytes=0-1,3-4' });
  await invalid.run();
  assert.equal(invalid.res.statusCode, 416); assert.equal(invalid.config(), undefined);
  const unsatisfied = relayHarness({ range: 'bytes=999-', status: 416 });
  await unsatisfied.run();
  assert.equal(unsatisfied.res.statusCode, 416); assert.equal(unsatisfied.reads(), 0);
});

test('Telegram headings, emphasis and lists render without Markdown markers and use UTF-16 offsets', () => {
  const result = formatTelegramText('🎬\n## Kino haqida\nOddiy **muhim** va _izoh_.\n* Birinchi\n- Ikkinchi');
  assert.equal(result.text, '🎬\nKino haqida\nOddiy muhim va izoh.\n• Birinchi\n• Ikkinchi');
  const styled = result.entities.map(entity => [entity.type, result.text.slice(entity.offset, entity.offset + entity.length)]);
  assert.deepEqual(styled, [['bold', 'Kino haqida'], ['bold', 'muhim'], ['italic', 'izoh']]);
  assert.equal(result.entities[0].offset, 3);
  assert.equal(formatTelegramText('<b>literal & safe</b>').text, '<b>literal & safe</b>');
  assert.equal(formatTelegramText('file_name va 2 * 3 * 4').text, 'file_name va 2 * 3 * 4');
  assert.equal(formatTelegramText('***Muhim***').text, 'Muhim');
});
test('long formatted Telegram responses retain valid entities across chunks and inline buttons on the last part', async () => {
  const bodies = [];
  const api = load('api', { env, formatTelegramText, entitiesForChunk, axios: {
    post: async (_url, body) => { bodies.push(body); return { data: { ok: true, result: { message_id: bodies.length } } }; },
    isAxiosError: () => false,
  } }, ['sendTelegramMessage']);
  const content = '🎬' + 'a'.repeat(8500);
  await api.sendTelegramMessage(123, `**${content}**`, [[{ text: 'Manba', url: 'https://example.org' }]]);
  assert.equal(bodies.map(body => body.text).join(''), content);
  assert.equal(bodies.length, 3);
  for (const body of bodies) {
    assert.ok(body.text.length <= 4000);
    assert.deepEqual(body.entities, [{ type: 'bold', offset: 0, length: body.text.length }]);
    assert.equal(body.parse_mode, undefined);
  }
  assert.equal(bodies[0].reply_markup, undefined);
  assert.equal(bodies.at(-1).reply_markup.inline_keyboard[0][0].text, 'Manba');
});

test('real video analysis progress is forwarded to the Telegram status callback', async () => {
  const stages = [];
  const { answerBot } = load('ai', {
    findMovieFromVideo: async (_text, _media, _delta, progress) => {
      progress('analyzing_video'); progress('catalog'); progress('uzbek_links');
      return { text: 'Film', model: 'test' };
    },
  }, ['answerBot']);
  await answerBot('Top', [{ mimeType: 'video/mp4', fileUri: 'https://example.org/video', durationSeconds: 10 }], [], undefined, stage => stages.push(stage));
  assert.deepEqual(stages, ['analyzing_video', 'catalog', 'uzbek_links', 'preparing']);
});
test('one progress message is edited by actual stages and cannot update after completion', async () => {
  const calls = [], saved = [];
  const { createBotProgress } = load('progress', { TelegramError }, ['createBotProgress']);
  const progress = createBotProgress(123, { save: async id => { saved.push(id); } }, {
    intervalMs: 0, now: Date.now,
    telegram: async (method, body) => { calls.push({ method, body }); return { message_id: 99 }; },
  });
  await progress.start('checking_video');
  progress.report('analyzing_video'); await new Promise(resolve => setImmediate(resolve));
  progress.report('uzbek_links'); await new Promise(resolve => setImmediate(resolve));
  await progress.finish('Done'); await progress.remove();
  const count = calls.length;
  progress.report('posters'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, count);
  assert.equal(calls.filter(call => call.method === 'sendMessage').length, 1);
  assert.deepEqual(saved, [99]);
  assert.match(calls[1].body.text, /sahnalar/);
  assert.match(calls[2].body.text, /dublaj/);
  assert.ok(calls.filter(call => call.method === 'editMessageText').every(call => call.body.message_id === 99));
  assert.equal(calls.at(-1).method, 'deleteMessage');
});
test('status failures are optional and rapid stages are coalesced without keeping timers after finish', async () => {
  const { createBotProgress } = load('progress', { TelegramError }, ['createBotProgress']);
  const failed = createBotProgress(123, { save: async () => {} }, {
    intervalMs: 0, now: Date.now, telegram: async () => { throw new TelegramError(503); },
  });
  await failed.start('checking_video'); failed.report('searching'); await failed.finish('Failed'); await failed.remove();
  const calls = [];
  const rapid = createBotProgress(123, { messageId: 99, save: async () => {} }, {
    intervalMs: 60000, now: Date.now, telegram: async (method, body) => { calls.push({ method, body }); return true; },
  });
  await rapid.start('checking_video'); rapid.report('analyzing_video'); rapid.report('searching');
  await rapid.finish('Done');
  assert.equal(calls.length, 2); assert.equal(calls.at(-1).body.text, 'Done');
  rapid.dispose();
});
test('video worker persists the progress message and removes it only after delivering the result', async () => {
  const events = [];
  const h = workerHarness({ fail: false, video: { file_id: 'video', duration: 10 }, events });
  await h.worker.drainBotQueue();
  assert.equal(h.job.progressMessageId, 99); assert.equal(h.job.status, 'sent');
  assert.deepEqual(events.slice(0, 3), [['start', 'checking_video'], ['stage', 'analyzing_video'], ['stage', 'searching']]);
  assert.equal(events.at(-2)[0], 'remove'); assert.equal(events.at(-1)[0], 'dispose');
});
test('a failed video search updates the status with the real failure and never reports success', async () => {
  const events = [];
  const h = workerHarness({ fail: false, video: { file_id: 'video', duration: 10 }, events,
    answerError: Object.assign(Error('Provider failed'), { failureCode: 'provider_unavailable' }) });
  await h.worker.drainBotQueue();
  assert.equal(h.job.status, 'ready');
  assert.match(events.find(event => event[0] === 'finish')[1], /AI xizmatida/);
  assert.equal(events.some(event => event[0] === 'remove'), false);
  assert.equal(events.some(event => event[0] === 'finish' && event[1].includes('✅')), false);
});

test('ordinary text shows a preparing status with typing enabled and removes it after the answer', async () => {
  const events = [];
  let typing;
  const h = workerHarness({ fail: false, events, onProgressOptions: options => { typing = options.typing; } });
  await h.worker.drainBotQueue();
  assert.deepEqual(events[0], ['start', 'preparing']);
  assert.equal(typing, true);
  assert.equal(h.job.status, 'sent'); assert.equal(h.sendCalls(), 1);
  assert.equal(events.at(-2)[0], 'remove'); assert.equal(events.at(-1)[0], 'dispose');
});
test('typing is refreshed while preparing, respects Telegram rate limits and stops on completion', async () => {
  const calls = [];
  let tick, active = false, now = 1000, fail = true;
  const { createBotProgress } = load('progress', {
    TelegramError,
    setInterval: callback => { tick = callback; active = true; return { unref() {} }; },
    clearInterval: () => { active = false; },
  }, ['createBotProgress']);
  const progress = createBotProgress(123, { typing: true, save: async () => {} }, {
    intervalMs: 0, now: () => now,
    telegram: async (method, body) => {
      calls.push({ method, body });
      if (method === 'sendChatAction' && fail) { fail = false; throw new TelegramError(429, 10); }
      return { message_id: 99 };
    },
  });
  await progress.start('preparing'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0].method, 'sendMessage');
  assert.equal(calls[1].method, 'sendChatAction'); assert.equal(calls[1].body.action, 'typing');
  tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(call => call.method === 'sendChatAction').length, 1);
  now += 11000; tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(call => call.method === 'sendChatAction').length, 2);
  await progress.finish('Done'); assert.equal(active, false);
  tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(call => call.method === 'sendChatAction').length, 2);
  await progress.remove(); progress.dispose();
});
