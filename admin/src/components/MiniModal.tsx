"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type MiniModalProps = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function MiniModal({ open, message, onConfirm, onClose }: MiniModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-4"
      >
        <p className="text-sm text-[#F3F4F6]">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[rgba(40,70,130,0.35)] px-4 py-2 text-sm text-[#F3F4F6]"
          >
            Yo‘q
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#1E4FD6] px-4 py-2 text-sm font-medium text-[#F3F4F6]"
          >
            Ha
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
