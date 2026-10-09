"use client";

import { useEffect, useRef, useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";
import { ProgressBar } from "@/components/ProgressBar";
import { actorImageUrl, apiBaseUrl, type Actor } from "@/lib/movies";

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

export function AddActorPanel({
  actor = null,
  open: openProp,
  onClose,
  onSaved,
  showButton = true,
}: {
  actor?: Actor | null;
  open?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  showButton?: boolean;
} = {}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;

  function close() {
    setInnerOpen(false);
    onClose?.();
  }
  const [actorName, setActorName] = useState("");
  const [aboutUz, setAboutUz] = useState("");
  const [aboutRu, setAboutRu] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);
  const uploadingRef = useRef(false);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearInterval(timer.current);
    },
    [],
  );

  function clearTimer() {
    if (timer.current == null) return;
    window.clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    if (!open || !actor) return;
    setActorName(actor.actorName ?? "");
    setAboutUz(actor.actorAbout?.uz ?? "");
    setAboutRu(actor.actorAbout?.ru ?? "");
    setImage(null);
    setPreview(actor.actorImg ? actorImageUrl(actor.actorImg) : "");
    setLoading(false);
    setProgress(0);
    setError("");
  }, [open, actor]);

  function onImagePick(file: File | null) {
    clearTimer();
    setImage(file);
    setPreview("");
    if (!file) {
      setLoading(false);
      setProgress(0);
      return;
    }
    setLoading(true);
    setProgress(6);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result ?? ""));
      setProgress(100);
    };
    reader.onerror = () => {
      setImage(null);
      setPreview("");
      setLoading(false);
      setProgress(0);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!image && !actor) {
      setError("Rasm kerak");
      return;
    }
    if (!actorName.trim() || !aboutUz.trim() || !aboutRu.trim()) {
      setError("Ism va ma’lumot to‘liq emas");
      return;
    }
    setSaving(true);
    uploadingRef.current = true;
    setLoading(true);
    setProgress(8);
    clearTimer();
    let value = 8;
    timer.current = window.setInterval(() => {
      value = Math.min(90, value + 4);
      setProgress((current) => Math.max(current, value));
    }, 200);
    try {
      const body = new FormData();
      body.append(
        "data",
        JSON.stringify({
          actorName,
          actorAbout: { uz: aboutUz, ru: aboutRu },
        }),
      );
      if (image) body.append("image", image);
      const result = await new Promise<{ ok?: boolean; error?: string; status: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(actor ? "PATCH" : "POST", actor ? `${apiBaseUrl}/api/actors/${actor.id}` : `${apiBaseUrl}/api/actors`);
        xhr.upload.onprogress = (eventProgress) => {
          if (!eventProgress.lengthComputable || eventProgress.total <= 0) return;
          const next = Math.round((eventProgress.loaded / eventProgress.total) * 100);
          value = Math.max(value, next);
          setProgress(next);
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText) as { ok?: boolean; error?: string };
            resolve({ ...parsed, status: xhr.status });
          } catch {
            resolve({ status: xhr.status });
          }
        };
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(body);
      });
      if (result.status < 200 || result.status >= 300 || !result.ok) {
        setError(result.error || "Aktyor saqlanmadi");
        return;
      }
      setProgress(100);
      if (onSaved) onSaved();
      close();
      setActorName("");
      setAboutUz("");
      setAboutRu("");
      setImage(null);
      setPreview("");
    } catch {
      setError("Serverga ulanib bo‘lmadi");
    } finally {
      clearTimer();
      uploadingRef.current = false;
      setLoading(false);
      setSaving(false);
    }
  }

  return (
    <>
      {showButton ? (
        <button
          type="button"
          onClick={() => setInnerOpen(true)}
          className="flex items-center gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] px-4 py-3 text-sm font-medium text-[#F3F4F6]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E4FD6] text-lg">+</span>
          Aktyor qo‘shish
        </button>
      ) : null}
      <GlobalModal open={open} title={actor ? "Tahrirlash" : "Aktyor qo‘shish"} onClose={close}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Ism</span>
            <input className={fieldClass} value={actorName} onChange={(event) => setActorName(event.target.value)} />
          </label>
          <div className="flex w-full flex-col gap-2">
            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] ${
                preview ? "min-h-44 p-0" : "gap-2 px-3 py-6"
              }`}
            >
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onImagePick(event.target.files?.[0] ?? null)}
              />
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="h-44 w-full object-cover"
                  onLoad={() => {
                    if (!uploadingRef.current) setLoading(false);
                  }}
                />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#6B7280]">
                    <path
                      d="M12 16V5M12 5l-4 4M12 5l4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-sm text-[#6B7280]">Rasm yuklash</span>
                </>
              )}
            </label>
            {loading ? <ProgressBar value={progress} /> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[#6B7280]">Ma’lumot, o‘zbekcha</span>
              <textarea
                className={`${fieldClass} scroll-none min-h-28`}
                value={aboutUz}
                onChange={(event) => setAboutUz(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[#6B7280]">Ma’lumot, ruscha</span>
              <textarea
                className={`${fieldClass} scroll-none min-h-28`}
                value={aboutRu}
                onChange={(event) => setAboutRu(event.target.value)}
              />
            </label>
          </div>
          {error ? <p className="text-sm text-[#E11D48]">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1E4FD6] px-4 py-2.5 text-sm font-medium text-[#F3F4F6] disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda" : "Saqlash"}
          </button>
        </form>
      </GlobalModal>
    </>
  );
}
