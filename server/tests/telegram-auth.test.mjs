import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Profile } from '../dist/models/Profile.js';
import { toAuthProfile } from '../dist/services/auth.service.js';

function load(file, deps, names) {
  const source = readFileSync(new URL(`../dist/${file}.js`, import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  return new Function(...Object.keys(deps), `${source}\nreturn {${names.join(',')}};`)(...Object.values(deps));
}
const token = 'test-bot-token';
const { telegramUser } = load('bot/security', { createHmac, timingSafeEqual, env: { telegramBotToken: token } }, ['telegramUser']);
function signed(user, date = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ user: JSON.stringify(user), auth_date: String(date) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}
function harness({ linked, google = false, race = false, avatar } = {}) {
  let profile = linked ? { _id: 'existing', name: 'Google name', googleId: 'google-id', email: 'user@example.org', picture: 'https://example.org/google.jpg' } : null;
  let session = linked ? { profileId: 'existing' } : null;
  let created = 0, reads = 0;
  const query = value => ({ lean: async () => value });
  const profiles = {
    findOneAndUpdate: (filter, update) => {
      reads++;
      if (filter._id) {
        if (!profile || profile.telegramId && profile.telegramId !== '123') return query(null);
        Object.assign(profile, update.$set);
        for (const key of Object.keys(update.$unset ?? {})) delete profile[key];
      } else if (!profile) {
        profile = { _id: 'new', ...update.$setOnInsert, ...(google ? { googleId: 'google-id' } : {}) };
        created++;
        if (race) return { lean: async () => { throw Object.assign(Error('Duplicate'), { code: 11000 }); } };
      }
      return query({ ...profile });
    },
    findOne: () => query(profile),
  };
  const sessions = {
    findById: () => query(session),
    findOneAndUpdate: async (_filter, update) => { session = { ...session, ...update.$set }; return session; },
  };
  const service = load('services/telegram-auth.service', { telegramUser, Profile: profiles, BotSession: sessions,
    telegramAvatar: { profilePicture: avatar ?? (async (_id, _profile, picture) => ({ picture, clearPhoto: true })) },
    toAuthProfile, signAccessToken: profile => `token:${profile.id}` }, ['loginWithTelegram', 'verifiedTelegramProfile']);
  return { ...service, created: () => created, reads: () => reads, profile: () => profile, session: () => session };
}

test('signed Telegram identity creates one profile without invented Google ID/email and reuses it', async () => {
  const h = harness(), data = signed({ id: 123, first_name: 'Ali', last_name: 'Valiyev', username: 'ali', photo_url: 'https://example.org/photo.jpg' });
  const first = await h.loginWithTelegram(data), second = await h.loginWithTelegram(data);
  assert.equal(first.profile.id, second.profile.id);
  assert.equal(h.created(), 1);
  assert.equal(first.profile.name, 'Ali Valiyev');
  assert.equal(first.profile.picture, 'https://example.org/photo.jpg');
  assert.equal(first.profile.telegramId, '123');
  assert.equal(h.profile().googleId, undefined);
  assert.equal(h.profile().email, undefined);
  assert.equal(h.session().profileId, first.profile.id);
});
test('forged, stale, duplicate or missing initData never reaches profile writes', async () => {
  const h = harness(), valid = signed({ id: 123, first_name: 'Ali' });
  for (const value of ['', valid.replace('123', '456'), `${valid}&user=duplicate`, signed({ id: 123 }, 1)]) {
    await assert.rejects(() => h.loginWithTelegram(value), /INVALID_TELEGRAM_DATA/);
  }
  assert.equal(h.reads(), 0);
});
test('a previously bound Google account retains its identity, name, picture and profile ID', async () => {
  const h = harness({ linked: true });
  const result = await h.loginWithTelegram(signed({ id: 123, first_name: 'Telegram name', photo_url: 'https://example.org/tg.jpg' }));
  assert.equal(result.profile.id, 'existing');
  assert.equal(result.profile.name, 'Google name');
  assert.equal(result.profile.picture, 'https://example.org/google.jpg');
  assert.equal(result.profile.googleId, 'google-id');
  assert.equal(h.created(), 0);
});
test('a missing/private or unsafe profile picture falls back to no picture', () => {
  const h = harness();
  for (const photo_url of [undefined, 'javascript:alert(1)', 'http://example.org/photo', 'https://user:pass@example.org/photo']) {
    assert.equal(h.verifiedTelegramProfile(signed({ id: 123, first_name: 'Ali', photo_url })).picture, '');
  }
});
test('a conflicting previously linked identity is refused instead of rebinding accounts', async () => {
  const h = harness({ linked: true });
  h.profile().telegramId = '456';
  await assert.rejects(() => h.loginWithTelegram(signed({ id: 123, first_name: 'Ali' })), /TELEGRAM_ACCOUNT_CONFLICT/);
  assert.equal(h.profile().telegramId, '456');
});
test('Bot API avatar is persisted when signed Telegram data omits photo_url', async () => {
  const h = harness({ avatar: async () => ({ picture: 'https://example.org/api/telegram/avatar/owner?v=abc', fileId: 'private-file-id', clearPhoto: false }) });
  const result = await h.loginWithTelegram(signed({ id: 123, first_name: 'Ali' }));
  assert.equal(result.profile.picture, 'https://example.org/api/telegram/avatar/owner?v=abc');
  assert.equal(h.profile().telegramPhotoFileId, 'private-file-id');
  assert.equal(result.profile.telegramPhotoFileId, undefined);
});
test('temporary avatar API failure does not break login or discard an existing avatar', async () => {
  let fail = false;
  const h = harness({ avatar: async () => {
    if (fail) throw Error('Temporary outage');
    return { picture: 'https://example.org/avatar', fileId: 'private-file-id', clearPhoto: false };
  } });
  const data = signed({ id: 123, first_name: 'Ali' });
  await h.loginWithTelegram(data); fail = true;
  assert.equal((await h.loginWithTelegram(data)).profile.picture, 'https://example.org/avatar');
});
test('concurrent profile insert uses the verified winner instead of creating another identity', async () => {
  const h = harness({ race: true });
  const result = await h.loginWithTelegram(signed({ id: 123, first_name: 'Ali' }));
  assert.equal(result.profile.id, 'new');
  assert.equal(h.created(), 1);
});
test('Telegram-only profiles validate and all provider IDs remain uniquely indexed when present', async () => {
  await new Profile({ telegramId: '123', name: 'Ali' }).validate();
  for (const field of ['googleId', 'email', 'telegramId']) {
    const index = Profile.schema.indexes().find(([keys]) => keys[field] === 1);
    assert.equal(index[1].unique, true);
    assert.deepEqual(index[1].partialFilterExpression[field], { $type: 'string' });
  }
});
test('legacy identity indexes are removed only after replacement unique indexes exist', async () => {
  const events = [];
  const { ensureProfileIdentityIndexes } = load('services/profile-indexes.service', { Profile: {
    createCollection: async () => events.push('collection'),
    createIndexes: async () => events.push('protected'),
    collection: { indexes: async () => [
      { name: '_id_', key: { _id: 1 }, unique: true },
      { name: 'email_1', key: { email: 1 }, unique: true },
      { name: 'googleId_1', key: { googleId: 1 }, unique: true },
      { name: 'telegramId_present', key: { telegramId: 1 }, unique: true, partialFilterExpression: {} },
    ], dropIndex: async name => events.push(name) },
  } }, ['ensureProfileIdentityIndexes']);
  await ensureProfileIdentityIndexes();
  assert.deepEqual(events, ['collection', 'protected', 'email_1', 'googleId_1']);
});
