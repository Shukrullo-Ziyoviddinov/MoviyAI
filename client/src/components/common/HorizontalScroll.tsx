"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DragState = {
  pointerId: number;
  x: number;
  scroll: number;
  lastX: number;
  lastT: number;
  vx: number;
  active: boolean;
};

type HorizontalScrollProps = {
  children: ReactNode;
  className?: string;
};

export function HorizontalScroll({ children, className }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    function onWheel(event: WheelEvent) {
      const scroller = ref.current;
      if (!scroller) return;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
      if (!sideways) return;
      const delta = event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 1) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      if (max <= 0) return;
      if ((delta < 0 && scroller.scrollLeft <= 0) || (delta > 0 && scroller.scrollLeft >= max - 1)) return;
      event.preventDefault();
      scroller.scrollLeft += delta;
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function stopMomentum() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    stopMomentum();
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scroll: event.currentTarget.scrollLeft,
      lastX: event.clientX,
      lastT: performance.now(),
      vx: 0,
      active: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.x;
    if (!state.active) {
      if (Math.abs(dx) < 6) return;
      state.active = true;
      suppressClick.current = true;
      setGrabbing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    const dt = Math.max(now - state.lastT, 1);
    state.vx = (event.clientX - state.lastX) / dt;
    state.lastX = event.clientX;
    state.lastT = now;
    event.currentTarget.scrollLeft = state.scroll - dx;
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    drag.current = null;
    setGrabbing(false);
    if (!state.active) return;
    const node = event.currentTarget;
    let velocity = state.vx;
    if (Math.abs(velocity) < 0.05) return;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - previous, 32);
      previous = now;
      velocity *= Math.pow(0.985, dt / 16);
      node.scrollLeft -= velocity * dt;
      if (Math.abs(velocity) > 0.02) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      ref={ref}
      className={`no-scrollbar flex touch-manipulation items-start overflow-x-auto overflow-y-hidden overscroll-x-auto select-none ${grabbing ? "cursor-grabbing" : "cursor-grab"} ${className ?? ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
