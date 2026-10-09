"use client";

import { useCallback, useEffect, useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";
import { MiniModal } from "@/components/MiniModal";
import { apiBaseUrl } from "@/lib/movies";

type Genre = {
  _id: string;
  name: string;
};

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18 10l-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13 7l4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GenreManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [nextName, setNextName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Genre | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/genres`);
    const body = (await response.json()) as { data?: Genre[]; error?: string };
    if (!response.ok) {
      setError(body.error || "Janrlar olinmadi");
      return;
    }
    const list = Array.isArray(body.data) ? body.data : [];
    setGenres(list);
    setError("");
  }, []);

  useEffect(() => {
    if (!open) {
      setNextName("");
      setEditingId(null);
      setError("");
      return;
    }
    void load().catch(() => setError("Janrlar olinmadi"));
  }, [open, load]);

  function beginEdit(genre: Genre) {
    setEditingId(genre._id);
    setNextName(genre.name);
    setError("");
  }

  async function saveGenre() {
    const name = nextName.trim();
    if (!name) {
      setError("Janr nomi kerak");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        editingId ? `${apiBaseUrl}/api/genres/${editingId}` : `${apiBaseUrl}/api/genres`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "Janr saqlanmadi");
        return;
      }
      setNextName("");
      setEditingId(null);
      await load();
    } catch {
      setError("Janr saqlanmadi");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/genres/${removeTarget._id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "Janr o‘chirilmadi");
        return;
      }
      if (editingId === removeTarget._id) {
        setEditingId(null);
        setNextName("");
      }
      setRemoveTarget(null);
      await load();
    } catch {
      setError("Janr o‘chirilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GlobalModal
        open={open}
        title="Janer malumotlari"
        onClose={() => {
          if (removeTarget) return;
          onClose();
        }}
        footer={
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveGenre();
            }}
          >
            <h3 className="text-sm font-semibold text-[#F3F4F6]">
              {editingId ? "Tahrirlash" : "Janer qo‘shish"}
            </h3>
            <input
              className={fieldClass}
              value={nextName}
              placeholder="Janr nomi"
              onChange={(event) => setNextName(event.target.value)}
            />
            {error ? <p className="text-sm text-[#E11D48]">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#1E4FD6] px-4 py-2.5 text-sm font-medium text-[#F3F4F6] disabled:opacity-60"
            >
              Saqlash
            </button>
          </form>
        }
      >
        <ul className="flex flex-col gap-2">
          {genres.map((genre) => (
            <li key={genre._id} className="flex items-center gap-2">
              <input readOnly className={fieldClass} value={genre.name} />
              <button
                type="button"
                aria-label="Tahrirlash"
                disabled={busy}
                onClick={() => beginEdit(genre)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16A34A] text-white"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                aria-label="O‘chirish"
                disabled={busy}
                onClick={() => setRemoveTarget(genre)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DC2626] text-white"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      </GlobalModal>
      <MiniModal
        open={Boolean(removeTarget)}
        message={
          removeTarget
            ? `Chindan ham ${removeTarget.name} janerni o‘chirmoqchimisiz?`
            : ""
        }
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
