import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideoUrl, extractVideoUrl } from '../dist/ai/video-import/services/video-url.service.js';
import { createVideoUrlResolver } from '../dist/ai/video-import/services/video-url-resolution.service.js';
import { isPublicVideoAddress } from '../dist/ai/video-import/validators/public-address.validator.js';
import { VideoUrlError } from '../dist/ai/video-import/types/video-import.types.js';

const youtubeId = 'dQw4w9WgXcQ';
const tiktokId = '7412345678901234567';
const tiktok = `https://www.tiktok.com/@example/video/${tiktokId}`;
const publicAddress = { address: '8.8.8.8', family: 4 };
const code = expected => error => error instanceof VideoUrlError && error.code === expected;

test('extracts a video from Uzbek prose and Markdown while leaving ordinary chat alone', () => {
  assert.equal(extractVideoUrl('Salom, qanday kino tavsiya qilasiz?'), null);
  const result = extractVideoUrl(`Manashu kinoni top: [video](https://youtu.be/${youtubeId}?si=tracking).`);
  assert.equal(result.platform, 'youtube'); assert.equal(result.videoId, youtubeId);
  assert.equal(result.canonicalUrl, `https://www.youtube.com/watch?v=${youtubeId}`);
  assert.equal(result.needsResolution, false);
  assert.equal(extractVideoUrl(`Qidir: (https://www.youtube.com/shorts/${youtubeId})!`).videoId, youtubeId);
});
test('Instagram reel, post and tv paths retain a validated shortcode and strip tracking', () => {
  for (const route of ['reel', 'p', 'tv']) {
    const result = validateVideoUrl(`https://instagram.com/${route}/AbC_12-x/?igsh=private-tracking`);
    assert.equal(result.platform, 'instagram'); assert.equal(result.videoId, 'AbC_12-x');
    assert.equal(result.canonicalUrl, `https://www.instagram.com/${route}/AbC_12-x/`);
  }
  assert.throws(() => validateVideoUrl('https://www.instagram.com/someone/'), code('UNSUPPORTED_VIDEO_URL'));
});
test('YouTube watch, mobile, Shorts and short links normalize to exactly one video', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${youtubeId}&list=playlist&t=5`,
    `https://m.youtube.com/watch?v=${youtubeId}`, `https://youtube.com/shorts/${youtubeId}/`,
    `https://youtu.be/${youtubeId}`, `https://WWW.YOUTUBE.COM/watch?v=${youtubeId}`,
  ]) assert.equal(validateVideoUrl(url).canonicalUrl, `https://www.youtube.com/watch?v=${youtubeId}`);
  for (const url of [`https://youtube.com/watch?v=${youtubeId}&v=${youtubeId}`, 'https://youtube.com/playlist?list=123',
    'https://youtube.com/watch?v=short', `https://youtu.be/${youtubeId}/another`])
    assert.throws(() => validateVideoUrl(url), code('UNSUPPORTED_VIDEO_URL'));
});
test('TikTok short codes remain unresolved instead of being mistaken for video IDs', () => {
  assert.equal(validateVideoUrl(tiktok + '?tracking=1').videoId, tiktokId);
  for (const value of ['https://vm.tiktok.com/ABC123/', 'https://vt.tiktok.com/ABC123/', 'https://www.tiktok.com/t/ABC123/']) {
    const result = validateVideoUrl(value);
    assert.equal(result.platform, 'tiktok'); assert.equal(result.kind, 'short');
    assert.equal(result.videoId, null); assert.equal(result.needsResolution, true);
  }
});
test('one request accepts one distinct video; repeated aliases are not separate jobs', () => {
  assert.throws(() => extractVideoUrl(`https://youtu.be/${youtubeId} ${tiktok}`), code('MULTIPLE_VIDEO_URLS'));
  assert.equal(extractVideoUrl(`https://youtu.be/${youtubeId} https://youtube.com/watch?v=${youtubeId}`).videoId, youtubeId);
  assert.throws(() => extractVideoUrl('x'.repeat(20001)), code('TEXT_TOO_LONG'));
});
test('rejects fake hosts, private literals, credentials, unsafe protocols and malformed paths', () => {
  for (const url of [
    `https://youtube.com.evil.example/watch?v=${youtubeId}`, `https://evilyoutube.com/watch?v=${youtubeId}`,
    `https://youtube.com./watch?v=${youtubeId}`, `https://www.youtube.com@127.0.0.1/watch?v=${youtubeId}`,
    `https://user:password@youtube.com/watch?v=${youtubeId}`, `https://youtube.com:8443/watch?v=${youtubeId}`,
    `http://youtube.com/watch?v=${youtubeId}`, `https://youtube.com\\@127.0.0.1/watch?v=${youtubeId}`,
    `https:////youtube.com/watch?v=${youtubeId}`, 'https://localhost/video', 'https://169.254.169.254/video',
    'https://2130706433/video', 'https://0x7f000001/video', 'https://[::1]/video', 'file:///etc/passwd',
    'javascript:alert(1)', `https://youtube.com/watch?v=${youtubeId}\ninternal`,
    'https://instagram.com/reel/../settings/', 'https://tiktok.com/@user/video/123',
  ]) assert.throws(() => validateVideoUrl(url), VideoUrlError, url);
});
test('public address policy rejects private, shared, mapped, reserved and documentation ranges', () => {
  for (const address of ['0.0.0.0', '10.0.0.1', '100.100.100.200', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '172.31.255.255', '192.168.0.1', '192.0.0.1', '192.0.2.1', '192.88.99.1',
    '198.18.0.1', '198.19.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', 'ff02::1', '2001:db8::1',
    '2001::1', '2002:7f00:1::', '3fff::1', 'not-an-ip']) assert.equal(isPublicVideoAddress(address), false, address);
  for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111'])
    assert.equal(isPublicVideoAddress(address), true, address);
});
test('short-link redirects validate every hop and pass a pinned public IP to the connection', async () => {
  const dns = [], requests = [];
  const resolve = createVideoUrlResolver({
    lookup: async hostname => { dns.push(hostname); return [{ address: '2606:4700:4700::1111', family: 6 }, publicAddress]; },
    head: async (url, address, signal) => {
      requests.push(url.href); assert.deepEqual(address, publicAddress); assert.equal(signal.aborted, false);
      return { status: 302, location: requests.length === 1 ? 'https://vt.tiktok.com/NEXT/' : `${tiktok}?tracking=1` };
    },
  });
  const result = await resolve('https://vm.tiktok.com/START/');
  assert.equal(result.videoId, tiktokId); assert.equal(result.canonicalUrl, tiktok);
  assert.equal(result.originalUrl, 'https://vm.tiktok.com/START/');
  assert.deepEqual(dns, ['vm.tiktok.com', 'vt.tiktok.com', 'www.tiktok.com']);
  assert.equal(requests.length, 2);
});
test('direct video URLs need safe DNS but never download a body or perform a HEAD request', async () => {
  let requests = 0;
  const resolve = createVideoUrlResolver({ lookup: async () => [publicAddress], head: async () => { requests++; throw Error('Unexpected network'); } });
  assert.equal((await resolve(tiktok)).videoId, tiktokId); assert.equal(requests, 0);
});
test('mixed/private DNS, empty answers and inconsistent address families fail before HTTP', async () => {
  for (const addresses of [[], [{ address: '127.0.0.1', family: 4 }], [publicAddress, { address: '10.0.0.1', family: 4 }], [{ address: '8.8.8.8', family: 6 }]]) {
    let requests = 0;
    const resolve = createVideoUrlResolver({ lookup: async () => addresses, head: async () => { requests++; return { status: 200 }; } });
    await assert.rejects(() => resolve('https://vm.tiktok.com/START/'), code('UNSAFE_ADDRESS'));
    assert.equal(requests, 0);
  }
});
test('redirects cannot escape platform allowlists or switch video platforms', async () => {
  for (const [location, expected] of [
    ['https://127.0.0.1/video', 'UNSUPPORTED_PLATFORM'], ['https://evil.example/video', 'UNSUPPORTED_PLATFORM'],
    [`https://youtu.be/${youtubeId}`, 'CROSS_PLATFORM_REDIRECT'], ['http://vt.tiktok.com/NEXT/', 'UNSAFE_URL'],
    ['https://name:password@vt.tiktok.com/NEXT/', 'UNSAFE_URL'],
  ]) {
    let lookups = 0;
    const resolve = createVideoUrlResolver({ lookup: async () => { lookups++; return [publicAddress]; }, head: async () => ({ status: 302, location }) });
    await assert.rejects(() => resolve('https://vm.tiktok.com/START/'), code(expected)); assert.equal(lookups, 1);
  }
});
test('short-link loops and excessive redirects have bounded request counts', async () => {
  let requests = 0;
  const loop = createVideoUrlResolver({ lookup: async () => [publicAddress], head: async () => { requests++; return { status: 302, location: '/START/?tracking=changed' }; } });
  await assert.rejects(() => loop('https://vm.tiktok.com/START/'), code('REDIRECT_LOOP')); assert.equal(requests, 1);
  requests = 0;
  const many = createVideoUrlResolver({ lookup: async () => [publicAddress], head: async () => ({ status: 302, location: `/NEXT${++requests}/` }) });
  await assert.rejects(() => many('https://vm.tiktok.com/START/'), code('REDIRECT_LIMIT')); assert.equal(requests, 5);
});
test('platform blocks, unresolved pages, DNS errors and timeouts return sanitized codes', async () => {
  for (const status of [200, 403, 404, 405, 503]) {
    const resolve = createVideoUrlResolver({ lookup: async () => [publicAddress], head: async () => ({ status }) });
    await assert.rejects(() => resolve('https://vm.tiktok.com/START/'), code(status >= 400 ? 'LINK_UNAVAILABLE' : 'SHORT_URL_UNRESOLVED'));
  }
  const dnsFailure = createVideoUrlResolver({ lookup: async () => { throw Error('Private network details'); }, head: async () => ({ status: 200 }) });
  await assert.rejects(() => dnsFailure(tiktok), code('DNS_FAILED'));
  const timeout = createVideoUrlResolver({ lookup: async () => [publicAddress], head: async () => { throw new VideoUrlError('LINK_TIMEOUT'); } });
  await assert.rejects(() => timeout('https://vm.tiktok.com/START/'), code('LINK_TIMEOUT'));
});
test('stop cancels a pending DNS lookup and never starts the next network stage', async () => {
  const controller = new AbortController(); let requests = 0;
  const resolve = createVideoUrlResolver({ lookup: async () => new Promise(() => {}), head: async () => { requests++; return { status: 200 }; } });
  const pending = resolve(tiktok, { signal: controller.signal }); controller.abort(new Error('Stopped by user'));
  await assert.rejects(() => pending, /Stopped by user/); assert.equal(requests, 0);
});
