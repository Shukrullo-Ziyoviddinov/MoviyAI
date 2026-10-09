"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddActorPanel } from "@/components/home/AddActorPanel";
import { MiniModal } from "@/components/MiniModal";
import { apiBaseUrl, type Actor } from "@/lib/movies";

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

export function ActorCardActions({ actor }: { actor: Actor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeActor() {
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/actors/${actor.id}`, { method: "DELETE" });
      if (!response.ok) return;
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 justify-end gap-2">
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
      </div>
      <MiniModal
        open={confirmDelete}
        message="Chindan ham ushbu aktyorni o‘chirishni hohlaysizmi?"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void removeActor()}
      />
      {open ? (
        <AddActorPanel
          actor={actor}
          open
          showButton={false}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
