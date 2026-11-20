import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchProvider, verifiedEmbed } from '../dist/utils/watch-provider.js';
import { resolveWatchEmbed } from '../dist/services/watch-embed.service.js';
import { uzbekDetailUrl, uzbekReleaseTitle } from '../dist/ai/services/uzbek-movie.service.js';
import { z } from 'zod';
import * as operations from '../dist/ai/utils/chat-operation.js';

test('provider policy rejects hostile hosts, credentials, ports and unrelated pages', () => {
  for (const url of ['https://ok.ru.evil.com/video/12', 'http://ok.ru/video/12', 'https://user@ok.ru/video/12', 'https://ok.ru:444/video/12', 'https://ok.ru/profile/12', 'https://127.0.0.1/video/12']) assert.equal(watchProvider(url), null);
  assert.equal(watchProvider('https://vk.com/video-12_34?list=abc').url, 'https://vkvideo.ru/video-12_34');
});
test('embed must match provider and exact video identity', () => {
  assert.equal(verifiedEmbed('https://ok.ru/video/123', 'https://ok.ru/videoembed/124'), null);
  assert.equal(verifiedEmbed('https://vkvideo.ru/video-12_34', 'https://vk.com/video_ext.php?oid=-12&id=35'), null);
  assert.ok(verifiedEmbed('https://vkvideo.ru/video-12_34', 'https://vk.com/video_ext.php?oid=-12&id=34&hash=actual'));
  assert.ok(verifiedEmbed('https://mover.uz/watch/Ab12/', 'https://mover.uz/video/embed/Ab12'));
});
test('resolver uses exported embed, checks frame headers and never fetches arbitrary extracted URLs', async () => {
  const calls = [];
  const fetcher = async url => { calls.push(url); return new Response(url.includes('/watch/')
    ? '<a href="https://127.0.0.1/private">bad</a><iframe src="https://mover.uz/video/embed/Ab12"></iframe>' : '<div class="player"></div>', { headers: { 'content-type': 'text/html' } }); };
  assert.equal((await resolveWatchEmbed('https://mover.uz/watch/Ab12/', fetcher)).embedUrl, 'https://mover.uz/video/embed/Ab12');
  assert.equal(calls.length, 2);
  assert.equal(await resolveWatchEmbed('https://ok.ru/video/123', async () => new Response('<div class="player"></div>', { headers: { 'content-type': 'text/html', 'x-frame-options': 'SAMEORIGIN' } })), null);
});
test('provider links survive catalog validation but never replace verified Uzbek release name', () => {
  assert.equal(uzbekDetailUrl('https://ok.ru/video/123'), 'https://ok.ru/video/123');
  assert.equal(uzbekReleaseTitle([{ title: 'Uploader title', url: 'https://ok.ru/video/123', site: 'ok.ru' }]), null);
});
test('web native and server enforce identical provider policies', () => {
  const source = readFileSync(new URL('../src/utils/watch-provider.ts', import.meta.url), 'utf8');
  for (const path of ['../../client/src/utils/watch-provider.ts', '../../clientNative/src/utils/watch-provider.ts']) assert.equal(readFileSync(new URL(path, import.meta.url), 'utf8'), source);
});

test('priority search queries VK then OK then Mover, preserving all confirmed alternatives', async () => {
  const queries = [], urls = ['https://vkvideo.ru/video-12_34', 'https://ok.ru/video/123', 'https://mover.uz/watch/Ab12/'];
  const source = readFileSync(new URL('../dist/ai/services/priority-watch-search.service.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  class GoogleGenAI { models = { generateContent: async request => {
    assert.match(request.config.systemInstruction, /Reject trailers/); return { text: JSON.stringify({ indices: [0, 1, 2, 99] }) };
  } }; }
  const searchWeb = async query => { queries.push(query); return { organic: [{ title: 'Film 2004 uzbek tilida toliq', link: urls[queries.length - 1], snippet: 'Full film, 120 minutes, Uzbek dub' }] }; };
  const lookup = new Function('GoogleGenAI', 'z', 'AI_CONFIG', 'searchWeb', 'watchProvider', 'operationSignal', 'operationCheck', 'fetch', source + '\nreturn findPriorityWatchLinks;')(
    GoogleGenAI, z, { apiKey: 'fake', serperApiKey: 'fake', models: { image: 'model' } }, searchWeb, watchProvider, operations.operationSignal, operations.operationCheck,
    async () => new Response('<h1>Film 2004 uzbek tilida toliq</h1>', { headers: { 'content-type': 'text/html' } }));
  const links = await lookup({ title: 'Film', titleUz: null, titleRu: null, year: 2004 });
  assert.deepEqual(queries.map(query => /site:([^ ]+)/.exec(query)[1]), ['vkvideo.ru', 'ok.ru', 'mover.uz']);
  assert.deepEqual(links.map(link => link.url), urls);
});
