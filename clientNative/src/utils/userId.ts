import { getSecureItem, setSecureItem } from '@/src/utils/storage';

const USER_ID_KEY = 'moviy.userId';

function createUserId() {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

let cachedUserId: string | null = null;

export async function getOrCreateUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const existing = await getSecureItem(USER_ID_KEY);
  if (existing) {
    cachedUserId = existing;
    return existing;
  }

  const next = createUserId();
  await setSecureItem(USER_ID_KEY, next);
  cachedUserId = next;
  return next;
}
