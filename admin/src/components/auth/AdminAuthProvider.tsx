"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminRegisterGate } from "@/components/auth/AdminRegisterGate";
import { apiBaseUrl } from "@/lib/movies";

const TOKEN_KEY = "moviyai-admin-session";
const NAME_KEY = "moviyai-admin-name";

const AdminAuthContext = createContext<{ logout: () => void; name: string }>({
  logout: () => {},
  name: "",
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const storedName = window.localStorage.getItem(NAME_KEY) ?? "";
    if (!token) {
      setName("");
      setOpen(true);
      setReady(true);
      return;
    }

    setName(storedName.trim());
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
          setName("");
          setOpen(true);
          return;
        }
        if (!response.ok) return;
        const body = (await response.json().catch(() => ({}))) as { data?: { name?: string } };
        const nextName = String(body.data?.name ?? storedName).trim();
        setName(nextName);
        if (nextName) window.localStorage.setItem(NAME_KEY, nextName);
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
    setName("");
    setOpen(true);
  }

  function enter(token: string, nextName: string) {
    const trimmed = nextName.trim();
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(NAME_KEY, trimmed);
    setName(trimmed);
    setOpen(false);
    setReady(true);
  }

  return (
    <AdminAuthContext.Provider value={{ logout, name }}>
      {children}
      {ready && open ? <AdminRegisterGate onEnter={enter} /> : null}
    </AdminAuthContext.Provider>
  );
}
