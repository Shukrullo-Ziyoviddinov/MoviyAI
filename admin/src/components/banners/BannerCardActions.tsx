"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddBannerPanel } from "@/components/home/AddBannerPanel";
import { MiniModal } from "@/components/MiniModal";
import { apiBaseUrl, type Banner } from "@/lib/movies";

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export function BannerCardActions({ banner }: { banner: Banner }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeBanner() {
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/banners/${banner._id}`, { method: "DELETE" });
      if (!response.ok) return;
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-1">
        <button
          type="button"
          aria-label="Tahrirlash"
          onClick={() => setOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#16A34A] text-white"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          aria-label="O‘chirish"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#DC2626] text-white"
        >
          <TrashIcon />
        </button>
      </div>
      <MiniModal
        open={confirmDelete}
        message="Chindan ham ushbu bannerni o‘chirishni hohlaysizmi?"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void removeBanner()}
      />
      {open ? (
        <AddBannerPanel
          banner={banner}
          open
          showButton={false}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
