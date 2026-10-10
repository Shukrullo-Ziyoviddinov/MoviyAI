"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminRegisterGate } from "@/components/auth/AdminRegisterGate";
import { apiBaseUrl } from "@/lib/movies";

const TOKEN_KEY = "moviyai-admin-session";

const AdminAuthContext = createContext<{ logout: () => void; name: string }>({
  logout: () => {},
  name: "",
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setOpen(true);
      return;
    }
    let alive = true;
    fetch(`${apiBaseUrl}/api/admin-access/session`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!alive) return;
        if (!response.ok) {
          window.localStorage.removeItem(TOKEN_KEY);
          setName("");
          setOpen(true);
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { data?: { name?: string } };
        setName(String(body.data?.name ?? "").trim());
        setOpen(false);
      })
      .catch(() => {
        if (alive) setOpen(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setName("");
    setOpen(true);
  }

  function enter(token: string, nextName: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
    setName(nextName);
    setOpen(false);
  }

  return (
    <AdminAuthContext.Provider value={{ logout, name }}>
      {children}
      {open ? <AdminRegisterGate onEnter={enter} /> : null}
    </AdminAuthContext.Provider>
  );
}
