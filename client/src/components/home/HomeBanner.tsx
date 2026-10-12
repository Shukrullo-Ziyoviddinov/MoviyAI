"use client";

import { useEffect, useRef, useState } from "react";
import { bannerImageUrl, type Banner } from "@/api/banners";
import { useTheme } from "@/components/theme/theme-state";

const VISIBLE = 3;

function hexToRgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HomeBanner({ banners }: { banners: Banner[] | null }) {
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [readyImg, setReadyImg] = useState<Record<string, boolean>>({});
  const deskRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; active: boolean } | null>(null);
  const wheelLock = useRef(false);
  const pageRef = useRef(0);
  pageRef.current = page;
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";
  const pages = banners ? Math.max(1, banners.length - VISIBLE + 1) : 1;

  useEffect(() => {
    setPage((current) => Math.min(current, pages - 1));
  }, [pages]);

  useEffect(() => {
    const node = deskRef.current;
    if (!node || pages <= 1) return;
    function onWheel(event: WheelEvent) {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 8) return;
      const dir = delta > 0 ? 1 : -1;
      const current = pageRef.current;
      if ((dir < 0 && current <= 0) || (dir > 0 && current >= pages - 1)) return;
      event.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      setPage((current) => Math.min(pages - 1, Math.max(0, current + (delta > 0 ? 1 : -1))));
      window.setTimeout(() => {
        wheelLock.current = false;
      }, 380);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [pages]);

  if (banners === null) {
    return (
      <>
        <div className="h-[calc(108vw-112px)] w-full animate-pulse md:hidden" style={{ backgroundColor: bone }} />
        <div className="hidden gap-3 p-4 md:max-[1177px]:flex md:max-[1177px]:h-[calc((100cqw-3.5rem)/3*1.7+2rem)] min-[1178px]:flex min-[1178px]:h-[calc(100dvh-144px)]">
          {Array.from({ length: 3 }, (_, card) => (
            <div key={card} className="h-full min-w-0 flex-1 animate-pulse rounded-2xl" style={{ backgroundColor: bone }} />
          ))}
        </div>
      </>
    );
  }

  if (banners.length === 0) return null;

  const fade = `linear-gradient(to bottom, transparent 0%, ${hexToRgba(colors.bg, 0.2)} 18%, ${hexToRgba(colors.bg, 0.5)} 40%, ${hexToRgba(colors.bg, 0.78)} 62%, ${hexToRgba(colors.bg, 0.94)} 82%, ${colors.bg} 100%)`;

  function markReady(img: string) {
    setReadyImg((current) => (current[img] ? current : { ...current, [img]: true }));
  }

  function onDeskDown(event: React.PointerEvent<HTMLDivElement>) {
    if (pages <= 1) return;
    drag.current = { x: event.clientX, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDeskMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    if (!state.active) {
      if (Math.abs(dx) < 8) return;
      state.active = true;
      setDragging(true);
    }
    setDragX(dx);
  }

  function onDeskUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) {
      setDragging(false);
      setDragX(0);
      return;
    }
    const width = event.currentTarget.clientWidth || 1;
    const step = (width - 20) / VISIBLE;
    setDragging(false);
    setDragX(0);
    if (state && event.clientX - state.x < -step * 0.2) setPage((current) => Math.min(pages - 1, current + 1));
    else if (state && event.clientX - state.x > step * 0.2) setPage((current) => Math.max(0, current - 1));
  }

  return (
    <div className="@container relative w-full overflow-hidden md:max-[1177px]:h-[calc((100cqw-3.5rem)/3*1.7+2rem)] min-[1178px]:h-[calc(100%-144px)]">
      <div
        ref={deskRef}
        className="relative hidden h-full touch-none overflow-hidden md:block"
        onPointerDown={onDeskDown}
        onPointerMove={onDeskMove}
        onPointerUp={onDeskUp}
        onPointerCancel={onDeskUp}
      >
        <div
          className="flex h-full gap-3 p-4"
          style={{
            transform: `translateX(calc(${-page} * (100cqw - 20px) / 3 + ${dragX}px))`,
            transition: dragging ? "none" : "transform 320ms cubic-bezier(0.33, 1, 0.68, 1)",
          }}
        >
          {banners.map((item) => {
            const src = bannerImageUrl(item.img);
            const ready = Boolean(readyImg[item.img]);
            return (
              <div
                key={`desk-${item.img}`}
                className="relative w-[calc((100cqw-2rem-1.5rem)/3)] shrink-0 overflow-hidden rounded-2xl max-[1177px]:h-[calc((100cqw-3.5rem)/3*1.7)] min-[1178px]:h-full"
                style={!ready ? { backgroundColor: bone } : undefined}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="w-full object-cover object-top max-[1177px]:h-[calc((100cqw-3.5rem)/3*1.7)] min-[1178px]:h-full"
                    onLoad={() => markReady(item.img)}
                    onError={() => markReady(item.img)}
                  />
                ) : null}
                {src && !ready ? <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
              </div>
            );
          })}
        </div>
        {pages > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: pages }, (_, dot) => (
              <span
                key={dot}
                className="rounded-full"
                style={{
                  width: dot === page ? 8 : 7,
                  height: dot === page ? 8 : 7,
                  backgroundColor: dot === page ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto md:hidden"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth || 1;
          setIndex(Math.round(event.currentTarget.scrollLeft / width));
        }}
      >
        {banners.map((item) => {
          const src = bannerImageUrl(item.img);
          const ready = Boolean(readyImg[item.img]);
          return (
            <div key={item.img} className="relative w-full shrink-0 snap-start overflow-hidden" style={!ready ? { backgroundColor: bone } : undefined}>
              {src ? (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="h-[calc(108vw-112px)] w-full object-cover object-top"
                  onLoad={() => markReady(item.img)}
                  onError={() => markReady(item.img)}
                />
              ) : null}
              {src && !ready ? <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]" style={{ background: fade }} />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-7 flex items-center justify-center gap-1.5 md:hidden">
        {banners.map((item, dot) => (
          <span
            key={item.img}
            className="rounded-full"
            style={{
              width: dot === index ? 8 : 7,
              height: dot === index ? 8 : 7,
              backgroundColor: dot === index ? "#FFFFFF" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
