"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const SHEET_OPEN_MS = 320;
export const SHEET_CLOSE_MS = 240;
export const SHEET_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

export function useSheetMotion(open: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [ready, setReady] = useState(false);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );
  const nodeRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);
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
    if (open) {
      setMounted(true);
      setShown(false);
      setReady(false);
      setDragY(0);
      setDragging(false);
      setSettleClose(false);
      return;
    }
    setShown(false);
    setDragging(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setReady(false);
    }, SHEET_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !mounted || ready) return;
    const node = nodeRef.current;
    if (!node) return;
    void node.offsetHeight;
    if (backdropRef.current) void backdropRef.current.offsetHeight;
    setReady(true);
    setShown(true);
  }, [open, mounted, ready]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (desktop || event.button !== 0) return;
    drag.current = { y: event.clientY, t: performance.now(), active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || desktop) return;
    const dy = event.clientY - state.y;
    if (!state.active) {
      if (dy < 8) return;
      state.active = true;
      setDragging(true);
    }
    setDragY(Math.max(0, dy));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;
    const dy = Math.max(0, event.clientY - state.y);
    const elapsed = Math.max(performance.now() - state.t, 1);
    const velocity = (dy / elapsed) * 1000;
    const sheet = event.currentTarget.parentElement;
    const height = sheet?.offsetHeight || 320;
    setDragging(false);
    if (dy > height * 0.2 || velocity > 800) {
      setSettleClose(true);
      window.setTimeout(onClose, SHEET_CLOSE_MS);
      return;
    }
    setDragY(0);
  }

  const backdrop = dragging ? Math.max(0, 0.55 * (1 - dragY / 420)) : shown ? 0.55 : 0;
  const transform = desktop
    ? shown
      ? "translateY(0) scale(1)"
      : "translateY(8px) scale(0.96)"
    : dragging
      ? `translateY(${dragY}px)`
      : settleClose || !shown
        ? "translateY(100%)"
        : "translateY(0)";

  return {
    mounted,
    shown,
    ready,
    desktop,
    bindSheet(node: HTMLElement | null) {
      nodeRef.current = node;
    },
    bindBackdrop(node: HTMLElement | null) {
      backdropRef.current = node;
    },
    dragging,
    backdrop,
    transform,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
