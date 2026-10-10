"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminRegisterGate } from "@/components/auth/AdminRegisterGate";
import { apiBaseUrl, mediaImageUrl } from "@/lib/movies";

const TOKEN_KEY = "moviyai-admin-session";
const NAME_KEY = "moviyai-admin-name";
const PHOTO_KEY = "moviyai-admin-photo";

const AdminAuthContext = createContext<{ logout: () => void; name: string; photo: string }>({
  logout: () => {},
  name: "",
  photo: "",
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const storedName = (window.localStorage.getItem(NAME_KEY) ?? "").trim();
    const storedPhoto = (window.localStorage.getItem(PHOTO_KEY) ?? "").trim();
    if (!token) {
      setName("");
      setPhoto("");
      setOpen(true);
      setReady(true);
      return;
    }

    setName(storedName);
    setPhoto(storedPhoto);
    setOpen(false);
    setReady(true);

    let alive = true;
    fetch(`${apiBaseUrl}/api/admin-access/session`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!alive) return;
        if (response.status === 401) {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(NAME_KEY);
          window.localStorage.removeItem(PHOTO_KEY);
          setName("");
          setPhoto("");
          setOpen(true);
          return;
        }
        if (!response.ok) return;
        const body = (await response.json().catch(() => ({}))) as { data?: { name?: string; photo?: string } };
        const nextName = String(body.data?.name ?? "").trim() || storedName;
        const nextPhoto = mediaImageUrl("adminimg", body.data?.photo) || storedPhoto;
        setName(nextName);
        setPhoto(nextPhoto);
        if (nextName) window.localStorage.setItem(NAME_KEY, nextName);
        if (nextPhoto) window.localStorage.setItem(PHOTO_KEY, nextPhoto);
        setOpen(false);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(NAME_KEY);
    window.localStorage.removeItem(PHOTO_KEY);
    setName("");
    setPhoto("");
    setOpen(true);
  }

  function enter(token: string, nextName: string, nextPhoto: string) {
    const trimmed = nextName.trim();
    const picture = nextPhoto.trim();
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(NAME_KEY, trimmed);
    window.localStorage.setItem(PHOTO_KEY, picture);
    setName(trimmed);
    setPhoto(picture);
    setOpen(false);
    setReady(true);
  }

  return (
    <AdminAuthContext.Provider value={{ logout, name, photo }}>
      {children}
      {ready && open ? <AdminRegisterGate onEnter={enter} /> : null}
    </AdminAuthContext.Provider>
  );
}
