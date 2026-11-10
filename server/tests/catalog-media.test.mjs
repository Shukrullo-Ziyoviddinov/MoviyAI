import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogMediaService, downloadCatalogImage, imageFormat, isPublicImageAddress, createPublicImageLookup } from '../dist/ai/catalog/services/catalog-media.service.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
test('image network boundary rejects internal, metadata, mapped IPv6 and reserved addresses', async () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '172.16.0.1', '192.168.0.1', '100.64.1.1', '198.18.1.1', '203.0.113.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1', '2001:db8::1']) assert.equal(isPublicImageAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(isPublicImageAddress(address), true);
  for (const url of ['http://example.com/a.jpg', 'https://127.0.0.1/a.jpg', 'https://100.64.0.1/a.jpg', 'https://198.18.0.1/a.jpg']) await assert.rejects(() => downloadCatalogImage(url, AbortSignal.timeout(1000)), /UNSAFE/);
});
test('DNS pinning rejects mixed public/private answers and returns only the already-validated socket address', async () => {
  const lookupResult = fn => new Promise(resolve => fn('images.example', {}, (error, address, family) => resolve({ error, address, family })));
  const denied = await lookupResult(createPublicImageLookup(async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]));
  assert.match(denied.error.message, /UNSAFE/);
  const allowed = await lookupResult(createPublicImageLookup(async () => [{ address: '8.8.8.8', family: 4 }]));
  assert.equal(allowed.error, null); assert.equal(allowed.address, '8.8.8.8'); assert.equal(allowed.family, 4);
});
test('only image signatures are accepted; upload names are unique and tracked before the PUT', async () => {
  assert.equal(imageFormat(Buffer.from('<html>not an image</html>')), null); assert.equal(imageFormat(png).mimeType, 'image/png');
  const tracked = [], puts = [];
  const media = createCatalogMediaService({ download: async url => url.includes('bad') ? Buffer.from('not an image') : png,
    put: async (folder, name, body, mimeType) => { assert.ok(tracked.includes(`${folder}/${name}`)); puts.push({ folder, name, body, mimeType }); return { path: `/img/${name}` }; }, remove: async () => {} });
  const signal = AbortSignal.timeout(1000); const assets = await media.store('movieimg', ['https://example.com/bad.jpg', 'https://example.com/ok.jpg', 'https://example.com/ok2.jpg'], 2, key => tracked.push(key), signal);
  assert.equal(assets.length, 2); assert.notEqual(assets[0].key, assets[1].key); assert.ok(assets.every(asset => asset.path.endsWith('.png')));
  assert.ok(puts.every(put => put.mimeType === 'image/png')); assert.equal(tracked.length, 2);
});
test('failed/uncertain PUT keys remain tracked for safe cleanup and HTML never reaches R2', async () => {
  const keys = []; const media = createCatalogMediaService({ download: async () => png, put: async () => { throw Error('R2 timeout'); }, remove: async () => {} });
  await assert.rejects(() => media.store('actorimg', ['https://example.com/a.png'], 1, key => keys.push(key), AbortSignal.timeout(1000)), /CATALOG_R2_IMAGE_UPLOAD/); assert.equal(keys.length, 1);
  let uploads = 0; const invalid = createCatalogMediaService({ download: async () => Buffer.from('<html>denied</html>'), put: async () => { uploads++; }, remove: async () => {} });
  await assert.rejects(() => invalid.store('actorimg', ['https://example.com/a.png'], 1, () => {}, AbortSignal.timeout(1000)), /UNAVAILABLE/); assert.equal(uploads, 0);
});
