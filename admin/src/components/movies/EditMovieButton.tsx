"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddMoviePanel } from "@/components/home/AddMoviePanel";
import type { Movie } from "@/lib/movies";

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

export function EditMovieButton({ movie }: { movie: Movie }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Tahrirlash"
        onClick={() => setOpen(true)}
        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16A34A] text-[#DC2626]"
      >
        <PencilIcon />
      </button>
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
