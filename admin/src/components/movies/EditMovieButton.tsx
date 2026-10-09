"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddMoviePanel } from "@/components/home/AddMoviePanel";
import { MiniModal } from "@/components/MiniModal";
import { apiBaseUrl, type Movie } from "@/lib/movies";

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

export function EditMovieButton({ movie }: { movie: Movie }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeMovie() {
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/movies/${movie.id}`, { method: "DELETE" });
      if (!response.ok) return;
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Tahrirlash"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A] text-white"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          aria-label="O‘chirish"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626] text-white"
        >
          <TrashIcon />
        </button>
      </span>
      <MiniModal
        open={confirmDelete}
        message="Chindan ham ushbu filimni o‘chirishni hohlaysizmi?"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void removeMovie()}
      />
      {open ? (
        <AddMoviePanel
          movie={movie}
          open
          showButton={false}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
