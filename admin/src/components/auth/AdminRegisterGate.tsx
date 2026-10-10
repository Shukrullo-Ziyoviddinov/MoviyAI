"use client";

import { useState } from "react";
import { apiBaseUrl, mediaImageUrl } from "@/lib/movies";

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

export function AdminRegisterGate({
  onEnter,
}: {
  onEnter: (token: string, name: string, photo: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function onPhoto(file: File | null) {
    setPhoto(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : "";
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim() || !password.trim() || !photo) {
      setError("Ism, raqam, rasm va parol kerak");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("phone", phone.trim());
      form.set("password", password);
      form.set("image", photo);
      const response = await fetch(`${apiBaseUrl}/api/admin-access`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: { token?: string; account?: { photo?: string } };
      };
      if (!response.ok || !body.ok || !body.data?.token) {
        setError(body.error || "Kirib bo‘lmadi");
        return;
      }
      onEnter(body.data.token, name.trim(), mediaImageUrl("adminimg", body.data.account?.photo) || preview);
    } catch {
      setError("Serverga ulanib bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#030308] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#1E4FD6] bg-[#101624] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <h2 className="text-lg font-semibold text-[#F3F4F6]">Ro‘yxatdan o‘tish</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Rasm</span>
            <span className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1E4FD6]">
                {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <input
                className="text-sm text-[#F3F4F6] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1E4FD6] file:px-3 file:py-2 file:text-sm file:text-[#F3F4F6]"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onPhoto(event.target.files?.[0] ?? null)}
              />
            </span>
          </label>
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
