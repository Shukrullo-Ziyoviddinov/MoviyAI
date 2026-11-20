import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchProvider, verifiedEmbed } from '../dist/utils/watch-provider.js';
import { resolveWatchEmbed } from '../dist/services/watch-embed.service.js';
import { uzbekDetailUrl, uzbekReleaseTitle } from '../dist/ai/services/uzbek-movie.service.js';
import { createPriorityWatchSearch } from '../dist/ai/services/priority-watch-search.service.js';

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

test('Google discovery preserves provider priority and skips unnecessary internal searches', async () => {
  const urls = ['https://mover.uz/watch/Ab12/', 'https://ok.ru/video/123', 'https://vkvideo.ru/video-12_34'];
  const queries = [], internal = [];
  const lookup = createPriorityWatchSearch({
    searchWeb: async (query, options, signal) => { queries.push(query); assert.ok(signal instanceof AbortSignal); return { organic: urls.map(link => ({title:'Film 2004 Uzbek',link,snippet:'Full movie',position:1})) }; },
    readPage: async () => ({title:'Film 2004 Uzbek',description:'',duration:6000,text:''}),
    searchProvider: async site => { internal.push(site); return {status:'ok',candidates:[]}; },
    verify: async (film, candidates) => candidates, log() {},
  });
  const links = await lookup({ title:'Film', titleUz:'Mahalliy nom', titleRu:'Russian name', year:2004 });
  assert.equal(queries.length,1); assert.equal(queries[0],'Mahalliy nom 2004'); assert.deepEqual(internal,[]);
  assert.deepEqual(links.map(link=>link.site),['vkvideo.ru','ok.ru','mover.uz']);
});
