"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BOTTOM_NAV_BAR, BOTTOM_NAV_LIFT } from "@/components/nav/BottomNav";

const MOBILE_SIZE = 68;
const DESKTOP_SIZE = 80;

export function FloatingAiButton() {
  const router = useRouter();
  const wrapRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [desktop, setDesktop] = useState(false);

  const size = desktop ? DESKTOP_SIZE : MOBILE_SIZE;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const parent = wrapRef.current?.parentElement;
    if (!parent) return;
    const place = () => {
      const bounds = parent.getBoundingClientRect();
      setPoint({
        x: Math.max(8, bounds.width - size - 8),
        y: Math.max(8, bounds.height - size - BOTTOM_NAV_BAR - BOTTOM_NAV_LIFT - 18),
      });
      setReady(true);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [size]);

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    drag.current = { x: event.clientX, y: event.clientY, left: point.x, top: point.y, moved: false };
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    const parent = wrapRef.current?.parentElement;
    if (!state || !parent) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && Math.hypot(dx, dy) < 6) return;
    state.moved = true;
    setDragging(true);
    const bounds = parent.getBoundingClientRect();
    const maxX = Math.max(8, bounds.width - size - 8);
    const maxY = Math.max(8, bounds.height - size - BOTTOM_NAV_BAR - BOTTOM_NAV_LIFT - 12);
    setPoint({
      x: Math.min(maxX, Math.max(8, state.left + dx)),
      y: Math.min(maxY, Math.max(8, state.top + dy)),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    drag.current = null;
    setDragging(false);
    if (!state?.moved) {
      router.push("/");
      return;
    }
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const bounds = parent.getBoundingClientRect();
    const maxX = Math.max(8, bounds.width - size - 8);
    setPoint((current) => ({ ...current, x: current.x + size / 2 < bounds.width / 2 ? 8 : maxX }));
  }

  return (
    <button
      ref={wrapRef}
      type="button"
      aria-label="AI suhbat"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-float-ai=""
      onTouchStart={(event) => event.stopPropagation()}
      className="absolute top-0 left-0 z-40 touch-none"
      style={{
        width: size,
        height: size,
        transform: `translate(${point.x}px, ${point.y}px)`,
        opacity: ready ? 1 : 0,
        transition: dragging ? "none" : "transform 280ms cubic-bezier(0.33, 1, 0.68, 1)",
      }}
    >
      <img src="/images/ai_preview_rev_1.png" alt="" className="h-full w-full object-contain" draggable={false} />
    </button>
  );
}
