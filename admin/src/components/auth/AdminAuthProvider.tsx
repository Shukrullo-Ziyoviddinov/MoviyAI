"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminRegisterGate } from "@/components/auth/AdminRegisterGate";
import { apiBaseUrl } from "@/lib/movies";

const TOKEN_KEY = "moviyai-admin-session";

const AdminAuthContext = createContext<{ logout: () => void }>({
  logout: () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

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
      .then((response) => {
        if (!alive) return;
        if (!response.ok) window.localStorage.removeItem(TOKEN_KEY);
        setOpen(!response.ok);
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
    setOpen(true);
  }

  function enter(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
    setOpen(false);
  }

  return (
    <AdminAuthContext.Provider value={{ logout }}>
      {children}
      {open ? <AdminRegisterGate onEnter={enter} /> : null}
    </AdminAuthContext.Provider>
  );
}
