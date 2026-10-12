"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { LANGUAGE_OPTIONS, useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";

const OPEN_MS = 320;
const CLOSE_MS = 240;
const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

export function LanguageModal() {
  const { colors } = useTheme();
  const { modalOpen, language, setLanguage, closeModal } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settleClose, setSettleClose] = useState(false);
  const drag = useRef<{ y: number; t: number; active: boolean } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setMounted(true);
      setDragY(0);
      setDragging(false);
      setSettleClose(false);
      const frame = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setShown(false);
    setDragging(false);
    const timer = window.setTimeout(() => setMounted(false), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  if (!mounted) return null;

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (desktop) return;
    drag.current = { y: event.clientY, t: performance.now(), active: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || desktop) return;
    const dy = event.clientY - state.y;
    if (!state.active) {
      if (dy < 8) return;
      state.active = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragY(Math.max(0, dy));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;
    const dy = Math.max(0, event.clientY - state.y);
    const elapsed = Math.max(performance.now() - state.t, 1);
    const velocity = dy / elapsed;
    const height = event.currentTarget.offsetHeight || 280;
    setDragging(false);
    if (dy > height * 0.25 || velocity > 0.8) {
      setSettleClose(true);
      window.setTimeout(closeModal, CLOSE_MS);
      return;
    }
    setDragY(0);
  }

  const mobileShift = dragging ? dragY : shown ? 0 : undefined;
  const backdrop = dragging ? Math.max(0, 0.5 * (1 - dragY / 320)) : shown ? 0.5 : 0;

  return (
    <div className={`fixed inset-0 z-[80] flex ${desktop ? "items-center justify-center p-6" : "items-end"}`}>
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 border-0 bg-black"
        style={{
          opacity: backdrop,
          transition: dragging ? "none" : `opacity ${shown ? OPEN_MS : CLOSE_MS}ms ${EASE}`,
        }}
        onClick={closeModal}
      />

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={
          desktop
            ? "relative w-full max-w-[420px] rounded-3xl border px-4 pt-4 pb-4"
            : "relative w-full rounded-t-[22px] border-t px-4 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]"
        }
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
          transform: desktop
            ? shown
              ? "translateY(0) scale(1)"
              : "translateY(8px) scale(0.96)"
            : dragging
              ? `translateY(${mobileShift}px)`
              : settleClose || !shown
                ? "translateY(100%)"
                : "translateY(0)",
          opacity: desktop ? (shown ? 1 : 0) : 1,
          transition: dragging ? "none" : `transform ${shown ? OPEN_MS : CLOSE_MS}ms ${EASE}, opacity ${shown ? OPEN_MS : CLOSE_MS}ms ${EASE}`,
        }}
      >
        {desktop ? (
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[16px] font-bold" style={{ color: colors.text }}>
              Tilni tanlang
            </p>
            <button type="button" aria-label="Yopish" onClick={closeModal} className="flex h-9 w-9 items-center justify-center">
              <CloseIcon size={22} color={colors.icon} />
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
            <p className="mb-2.5 px-1 text-[16px] font-bold" style={{ color: colors.text }}>
              Tilni tanlang
            </p>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          {LANGUAGE_OPTIONS.map((item) => {
            const active = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className="flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left"
                style={{
                  backgroundColor: active ? colors.panelSoft : "transparent",
                  borderColor: active ? colors.border : "transparent",
                }}
              >
                <img src={item.flag} alt="" className="h-6 w-9 rounded object-cover" />
                <span className="flex-1 text-[15px] font-semibold" style={{ color: colors.text }}>
                  {item.label}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? colors.accent : "transparent" }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
