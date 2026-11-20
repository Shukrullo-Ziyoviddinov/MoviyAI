"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthRequestError, fetchAuthMe, loginWithGoogleIdToken, loginWithTelegram } from "@/api/auth";
import { authStorageKey, clearAuthToken, readAuthToken, writeAuthToken } from "@/api/client";
import type { AuthProfile } from "@/types/auth";
import { TelegramAuthNotice } from './TelegramAuthNotice';

const PROFILE_KEY = "moviy.authProfile";

export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "513548633161-lo14vsek9h5j0nlrdomoq0536pepj0i9.apps.googleusercontent.com";

type AuthContextValue = {
  token: string | null;
  profile: AuthProfile | null;
  ready: boolean;
  busy: boolean;
  modalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  requireAuth: () => boolean;
  loginWithIdToken: (idToken: string) => Promise<void>;
  replaceProfile: (profile: AuthProfile) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readCachedProfile() {
  try {
    const raw = window.localStorage.getItem(authStorageKey(PROFILE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthProfile;
    if (!parsed?.id || (!parsed.email && !parsed.telegramId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProfile(profile: AuthProfile | null) {
  try {
    if (!profile) window.localStorage.removeItem(authStorageKey(PROFILE_KEY));
    else window.localStorage.setItem(authStorageKey(PROFILE_KEY), JSON.stringify(profile));
  } catch { /* A private Mini App can authenticate without a disk cache. */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [telegramRetry, setTelegramRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function restoreSession() {
      if (!alive) return;
      const initData = window.Telegram?.WebApp?.initData;
      if (initData) {
        // Never expose another Telegram user's cache before verification.
        clearAuthToken();
        writeProfile(null);
        setToken(null);
        setProfile(null);
        setReady(false);
        setBusy(true);
        setTelegramError('');
        try {
          const result = await loginWithTelegram(initData, AbortSignal.any([controller.signal, AbortSignal.timeout(70000)]));
          if (!alive) return;
          writeAuthToken(result.token);
          writeProfile(result.profile);
          setToken(result.token);
          setProfile(result.profile);
        } catch {
          if (alive) setTelegramError('telegram_login_failed');
        } finally {
          if (alive) { setReady(true); setBusy(false); }
        }
        return;
      }
      const saved = readAuthToken();
      if (!saved) { setReady(true); return; }
      setToken(saved);
      setProfile(readCachedProfile());
      try {
        const fresh = await fetchAuthMe();
        if (!alive) return;
        const nextToken = fresh.token || saved;
        writeAuthToken(nextToken);
        writeProfile(fresh.profile);
        setToken(nextToken);
        setProfile(fresh.profile);
      } catch (err) {
        if (!alive || !(err instanceof AuthRequestError) || err.status !== 401) return;
        clearAuthToken();
        writeProfile(null);
        setToken(null);
        setProfile(null);
      } finally {
        if (alive) setReady(true);
      }
    }
    void Promise.resolve().then(restoreSession);
    return () => { alive = false; controller.abort(); };
  }, [telegramRetry]);

  function openAuthModal() {
    if (window.Telegram?.WebApp?.initData) {
      if (busy) return;
      setTelegramRetry(value => value + 1);
      return;
    }
    setModalOpen(true);
  }

  async function loginWithIdToken(idToken: string) {
    setBusy(true);
    try {
      const result = await loginWithGoogleIdToken(idToken);
      writeAuthToken(result.token);
      writeProfile(result.profile);
      setToken(result.token);
      setProfile(result.profile);
      setModalOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function replaceProfile(next: AuthProfile) {
    writeProfile(next);
    setProfile(next);
  }

  function logout() {
    clearAuthToken();
    writeProfile(null);
    setToken(null);
    setProfile(null);
    setModalOpen(false);
  }

  function requireAuth() {
    if (token && profile) return true;
    openAuthModal();
    return false;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        profile,
        ready,
        busy,
        modalOpen,
        openAuthModal,
        closeAuthModal: () => setModalOpen(false),
        requireAuth,
        loginWithIdToken,
        replaceProfile,
        logout,
      }}
    >
      {children}
      {telegramError && <TelegramAuthNotice onRetry={() => setTelegramRetry(value => value + 1)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
