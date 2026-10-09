"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type GlobalModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function GlobalModal({ open, title, onClose, children }: GlobalModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-modal-title"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(40,70,130,0.35)] px-4 py-3">
          <h2 id="global-modal-title" className="text-base font-semibold text-[#F3F4F6]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#6B7280]"
          >
            Yopish
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
