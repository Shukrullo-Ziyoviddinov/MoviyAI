import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from '@/src/utils/storage';
import {
  getAuthTokenKey,
  setAuthTokenSync,
} from '@/src/utils/authToken';
import type { AuthProfile } from '@/src/types/auth';
import { fetchAuthMe, loginWithGoogleIdToken } from '@/src/api/auth';
import { create } from 'zustand';

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
      const token = await getSecureItem(getAuthTokenKey());
      setAuthTokenSync(token);
      if (!token) {
        set({ token: null, profile: null, hydrated: true });
        return;
      }
      set({ token, busy: true });
      const profile = await fetchAuthMe();
      set({ profile, hydrated: true, busy: false });
    } catch {
      setAuthTokenSync(null);
      await deleteSecureItem(getAuthTokenKey());
      set({ token: null, profile: null, hydrated: true, busy: false });
    }
  },

  setSession: async (token, profile) => {
    setAuthTokenSync(token);
    await setSecureItem(getAuthTokenKey(), token);
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
    setAuthTokenSync(null);
    await deleteSecureItem(getAuthTokenKey());
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
