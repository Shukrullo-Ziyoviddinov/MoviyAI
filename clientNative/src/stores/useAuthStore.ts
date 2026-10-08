import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from '@/src/utils/storage';
import {
  getAuthProfileKey,
  getAuthTokenBackupKey,
  getAuthTokenKey,
  setAuthTokenSync,
} from '@/src/utils/authToken';
import type { AuthProfile } from '@/src/types/auth';
import { fetchAuthMe, loginWithGoogleIdToken } from '@/src/api/auth';
import { create } from 'zustand';

function isUnauthorized(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { response?: { status?: number } }).response?.status;
  return status === 401;
}

function readCachedProfile(raw: string | null): AuthProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthProfile;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function persistSession(token: string, profile: AuthProfile) {
  setAuthTokenSync(token);
  await Promise.all([
    setSecureItem(getAuthTokenKey(), token),
    AsyncStorage.setItem(getAuthTokenBackupKey(), token),
    AsyncStorage.setItem(getAuthProfileKey(), JSON.stringify(profile)),
  ]);
}

async function clearSession() {
  setAuthTokenSync(null);
  await Promise.all([
    deleteSecureItem(getAuthTokenKey()),
    AsyncStorage.removeItem(getAuthTokenBackupKey()),
    AsyncStorage.removeItem(getAuthProfileKey()),
  ]);
}

type AuthModalReason = 'splash' | 'wishlist' | 'comment' | 'profile' | null;

type AuthState = {
  token: string | null;
  profile: AuthProfile | null;
  hydrated: boolean;
  busy: boolean;
  modalOpen: boolean;
  modalReason: AuthModalReason;
  hydrate: () => Promise<void>;
  setSession: (token: string, profile: AuthProfile) => Promise<void>;
  loginWithIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  openAuthModal: (reason?: AuthModalReason) => void;
  closeAuthModal: () => void;
  requireAuth: (reason?: AuthModalReason) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  profile: null,
  hydrated: false,
  busy: false,
  modalOpen: false,
  modalReason: null,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      let token = await getSecureItem(getAuthTokenKey());
      if (!token) token = await AsyncStorage.getItem(getAuthTokenBackupKey());
      const cached = readCachedProfile(
        await AsyncStorage.getItem(getAuthProfileKey())
      );
      setAuthTokenSync(token);
      if (!token) {
        set({ token: null, profile: null, hydrated: true });
        return;
      }
      set({ token, profile: cached, hydrated: true, busy: true });
      try {
        const fresh = await fetchAuthMe();
        const nextToken = fresh.token || token;
        await persistSession(nextToken, fresh.profile);
        set({ token: nextToken, profile: fresh.profile, busy: false });
      } catch (err) {
        if (isUnauthorized(err)) {
          await clearSession();
          set({ token: null, profile: null, busy: false });
          return;
        }
        set({ busy: false });
      }
    } catch {
      set({ hydrated: true, busy: false });
    }
  },

  setSession: async (token, profile) => {
    await persistSession(token, profile);
    set({ token, profile, modalOpen: false, modalReason: null });
  },

  loginWithIdToken: async (idToken) => {
    set({ busy: true });
    try {
      const result = await loginWithGoogleIdToken(idToken);
      await get().setSession(result.token, result.profile);
    } finally {
      set({ busy: false });
    }
  },

  logout: async () => {
    await clearSession();
    set({ token: null, profile: null, modalOpen: false, modalReason: null });
  },

  openAuthModal: (reason = 'profile') => {
    set({ modalOpen: true, modalReason: reason });
  },

  closeAuthModal: () => {
    set({ modalOpen: false, modalReason: null });
  },

  requireAuth: (reason = 'profile') => {
    if (get().token && get().profile) return true;
    get().openAuthModal(reason);
    return false;
  },
}));
