import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramAvatarService } from '../dist/bot/avatar.js';
import { toAuthProfile } from '../dist/services/auth.service.js';

const id = 'a'.repeat(24);
const jpeg = Buffer.from([255, 216, 255, 224, 1, 2, 3]);
function harness(options = {}) {
  let calls = 0, downloads = 0, reads = 0;
  const service = createTelegramAvatarService({
    telegram: async (method, body, settings) => {
      assert.ok(settings.timeoutMs <= 4000);
      if (method === 'getUserProfilePhotos') {
        assert.equal(body.user_id, 123); assert.equal(body.limit, 1);
        return { photos: options.photos ?? [[{ file_id: 'small-private-id', file_unique_id: 'small', width: 160, height: 160 },
          { file_id: 'large-private-id', width: 640, height: 640 }]] };
      }
      calls++;
      await options.wait;
      return { file_path: options.path ?? 'photos/avatar.jpg', file_size: options.size ?? jpeg.length };
    },
    findProfile: async () => { reads++; return options.missing ? null : { telegramPhotoFileId: 'small-private-id' }; },
    download: async () => { downloads++; return options.bytes ?? jpeg; },
  });
  return { service, calls: () => calls, downloads: () => downloads, reads: () => reads };
}
test('missing initData photo falls back to a small Bot API avatar with a token-free public URL', async () => {
  const h = harness(), avatar = await h.service.profilePicture('123', id, '');
  assert.equal(avatar.fileId, 'small-private-id');
  assert.equal(new URL(avatar.picture).pathname, `/api/telegram/avatar/${id}`);
  assert.doesNotMatch(avatar.picture, /small-private-id|api.telegram.org\/file\/bot/);
  assert.equal(avatar.clearPhoto, false);
});
test('no accessible Telegram photo uses only the signed fallback and requests removal of an old file reference', async () => {
  const h = harness({ photos: [] });
  assert.deepEqual(await h.service.profilePicture('123', id, ''), { picture: '', clearPhoto: true });
  assert.equal((await h.service.profilePicture('123', id, 'https://example.org/signed.jpg')).picture, 'https://example.org/signed.jpg');
});
test('private Telegram file IDs never enter the auth DTO', () => {
  const profile = toAuthProfile({ _id: id, name: 'Ali', telegramId: '123', telegramPhotoFileId: 'SECRET_FILE_ID' });
  assert.doesNotMatch(JSON.stringify(profile), /SECRET_FILE_ID|telegramPhotoFileId/);
});
test('avatar reads verify image bytes, cache tiny files and deduplicate concurrent downloads', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const h = harness({ wait });
  const first = h.service.read(id), second = h.service.read(id);
  await new Promise(resolve => setImmediate(resolve)); release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.mimeType, 'image/jpeg'); assert.deepEqual(a.bytes, jpeg); assert.deepEqual(a, b);
  await h.service.read(id);
  assert.equal(h.calls(), 1); assert.equal(h.downloads(), 1);
});
test('unknown profiles cannot be used to download arbitrary Telegram photos', async () => {
  const h = harness({ missing: true });
  assert.equal(await h.service.read('123'), null); assert.equal(h.reads(), 0);
  assert.equal(await h.service.read(id), null); assert.equal(h.calls(), 0);
});
test('unsafe paths, oversized files and non-image responses are rejected before delivery', async () => {
  for (const options of [{ path: '../private/file' }, { path: 'https://example.org/file' }, { size: 300000 },
    { bytes: Buffer.alloc(300000) }, { bytes: Buffer.from('<html>error</html>') }]) {
    const h = harness(options);
    await assert.rejects(() => h.service.read(id), /AVATAR_INVALID/);
    if (options.path || options.size) assert.equal(h.downloads(), 0);
  }
});
