import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

function equal(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function webhookSecret() {
  return createHmac('sha256', env.telegramBotToken).update('moviy-telegram-webhook-v1').digest('hex');
}
export function validWebhook(value: string) {
  return !!env.telegramBotToken && equal(value, webhookSecret());
}
export function telegramUser(initData: string, now = Date.now()): string | null {
  if (!env.telegramBotToken || initData.length > 16000) return null;
  try {
    const params = new URLSearchParams(initData);
    if ([...params.keys()].some((key, index, keys) => keys.indexOf(key) !== index)) return null;
    const hash = params.get('hash') ?? '';
    params.delete('hash');
    const date = Number(params.get('auth_date'));
    if (!Number.isFinite(date) || date * 1000 > now + 30000 || now - date * 1000 > 3600000) return null;
    const secret = createHmac('sha256', 'WebAppData').update(env.telegramBotToken).digest();
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
    const expected = createHmac('sha256', secret).update(check).digest('hex');
    if (!/^[a-f0-9]{64}$/.test(hash) || !equal(hash, expected)) return null;
    const user = JSON.parse(params.get('user') ?? '{}');
    return Number.isSafeInteger(user.id) && user.id > 0 ? String(user.id) : null;
  } catch { return null; }
}
export function mediaSignature(id: string, expires: string) {
  return createHmac('sha256', env.telegramBotToken).update(`media:${id}:${expires}`).digest('hex');
}
export function avatarSignature(id: string, version: string) {
  return createHmac('sha256', env.telegramBotToken).update(`avatar:${id}:${version}`).digest('hex');
}
export function validAvatarSignature(id: string, version: string, signature: string) {
  return !!env.telegramBotToken && /^[a-f0-9]{24}$/i.test(id) && /^[a-f0-9]{16}$/.test(version)
    && /^[a-f0-9]{64}$/.test(signature) && equal(signature, avatarSignature(id, version));
}
export function validMediaSignature(id: string, expires: string, signature: string) {
  const time = Number(expires);
  return !!env.telegramBotToken && Number.isFinite(time) && time > Date.now() && time <= Date.now() + 7200000
    && equal(signature, mediaSignature(id, expires));
}
