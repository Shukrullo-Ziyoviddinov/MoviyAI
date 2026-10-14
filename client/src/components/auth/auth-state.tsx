"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthRequestError, fetchAuthMe, loginWithGoogleIdToken } from "@/api/auth";
import { clearAuthToken, readAuthToken, writeAuthToken } from "@/api/client";
import type { AuthProfile } from "@/types/auth";

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
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthProfile;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProfile(profile: AuthProfile | null) {
  if (!profile) {
    window.localStorage.removeItem(PROFILE_KEY);
    return;
  }
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const saved = readAuthToken();
    if (!saved) {
      setReady(true);
      return;
    }
    setToken(saved);
    setProfile(readCachedProfile());
    let alive = true;
    fetchAuthMe()
      .then((fresh) => {
        if (!alive) return;
        const nextToken = fresh.token || saved;
        writeAuthToken(nextToken);
        writeProfile(fresh.profile);
        setToken(nextToken);
        setProfile(fresh.profile);
      })
      .catch((err) => {
        if (!alive) return;
        if (!(err instanceof AuthRequestError) || err.status !== 401) return;
        clearAuthToken();
        writeProfile(null);
        setToken(null);
        setProfile(null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

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
    setModalOpen(true);
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
        openAuthModal: () => setModalOpen(true),
        closeAuthModal: () => setModalOpen(false),
        requireAuth,
        loginWithIdToken,
        replaceProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
