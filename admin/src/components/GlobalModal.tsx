"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type GlobalModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
};

export function GlobalModal({ open, title, onClose, children, wide, footer }: GlobalModalProps) {
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
        className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(40,70,130,0.35)] px-4 py-3">
          <h2 id="global-modal-title" className="text-base font-semibold text-[#F3F4F6]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="text-[#6B7280]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="scroll-none min-h-0 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-[rgba(40,70,130,0.35)] px-4 py-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
