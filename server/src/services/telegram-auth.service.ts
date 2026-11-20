import { telegramUser } from '../bot/security.js';
import { BotSession } from '../bot/models.js';
import { Profile } from '../models/Profile.js';
import { signAccessToken, toAuthProfile } from './auth.service.js';
import { telegramAvatar } from '../bot/avatar.js';

export function verifiedTelegramProfile(initData: string) {
  const telegramId = telegramUser(initData);
  if (!telegramId) throw Error('INVALID_TELEGRAM_DATA');
  // Parse profile fields only after verifying the complete signed payload.
  const user = JSON.parse(new URLSearchParams(initData).get('user')!) as {
    first_name?: unknown; last_name?: unknown; username?: unknown; photo_url?: unknown;
  };
  const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const name = [text(user.first_name, 100), text(user.last_name, 100)].filter(Boolean).join(' ') || 'Telegram';
  const username = text(user.username, 64);
  let picture = '';
  try {
    const url = new URL(text(user.photo_url, 2048));
    if (url.protocol === 'https:' && !url.username && !url.password) picture = url.href;
  } catch { /* Telegram may omit a private profile picture. */ }
  return { telegramId, name, picture, telegramUsername: username };
}

export async function loginWithTelegram(initData: string) {
  const input = verifiedTelegramProfile(initData);
  const session = await BotSession.findById(input.telegramId).lean();
  let doc;
  if (session?.profileId) {
    // Previously claimed bot results already bind this Telegram identity to an
    // authenticated account. Keep that account and its existing UI history.
    doc = await Profile.findOneAndUpdate({ _id: session.profileId,
      $or: [{ telegramId: { $exists: false } }, { telegramId: input.telegramId }] },
    { $set: { telegramId: input.telegramId, telegramUsername: input.telegramUsername } }, { returnDocument: 'after' }).lean();
    if (!doc) throw Error('TELEGRAM_ACCOUNT_CONFLICT');
  } else {
    try {
      doc = await Profile.findOneAndUpdate({ telegramId: input.telegramId },
        { $setOnInsert: input }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      doc = await Profile.findOne({ telegramId: input.telegramId }).lean();
    }
  }
  if (!doc) throw Error('PROFILE_UPSERT_FAILED');
  if (!doc.googleId) {
    // photo_url is optional. The bot can retrieve an accessible profile photo
    // without exposing its token-bearing file URL to the browser or database.
    const avatar = await telegramAvatar.profilePicture(input.telegramId, doc._id.toString(), input.picture).catch(() => null);
    doc = await Profile.findOneAndUpdate({ _id: doc._id, googleId: { $exists: false } },
      { $set: { name: input.name, picture: avatar?.picture ?? (input.picture || doc.picture || ''), telegramUsername: input.telegramUsername,
        ...(avatar?.fileId ? { telegramPhotoFileId: avatar.fileId } : {}) },
        ...(avatar?.clearPhoto ? { $unset: { telegramPhotoFileId: 1 } } : {}) }, { returnDocument: 'after' }).lean() ?? doc;
  }
  const profile = toAuthProfile(doc);
  let bound;
  try {
    bound = await BotSession.findOneAndUpdate({ _id: input.telegramId,
      $or: [{ profileId: null }, { profileId: profile.id }] }, { $set: { profileId: profile.id } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const winner = await BotSession.findById(input.telegramId).lean();
    if (winner?.profileId === profile.id) bound = winner;
  }
  if (!bound) throw Error('TELEGRAM_ACCOUNT_CONFLICT');
  return { profile, token: signAccessToken(profile) };
}
