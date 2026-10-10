"use client";

import { useState } from "react";
import { apiBaseUrl } from "@/lib/movies";

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

export function AdminRegisterGate({ onEnter }: { onEnter: (token: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError("Ism, raqam va parol kerak");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: { token?: string };
      };
      if (!response.ok || !body.ok || !body.data?.token) {
        setError(body.error || "Kirib bo‘lmadi");
        return;
      }
      onEnter(body.data.token);
    } catch {
      setError("Serverga ulanib bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-5"
      >
        <h2 className="text-lg font-semibold text-[#F3F4F6]">Ro‘yxatdan o‘tish</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Ism</span>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Raqam</span>
            <input
              className={fieldClass}
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Parol</span>
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-[#E11D48]">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1E4FD6] px-4 py-2.5 text-sm font-medium text-[#F3F4F6] disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda" : "Kirish"}
          </button>
        </div>
      </form>
    </div>
  );
}
