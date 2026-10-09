"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { isNavActive, navItems } from "@/components/nav";

const COLLAPSED = 72;
const MIN = 200;
const MAX = 400;
const DEFAULT = 240;
const CLOSE_UNDER = 160;

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MovieIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 5v14M16 5v14M3 9h5M3 15h5M16 9h5M16 15h5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ActorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 19.5C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const icons = {
  "/": HomeIcon,
  "/movies": MovieIcon,
  "/actors": ActorIcon,
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT);
  const dragRef = useRef<{ x: number; width: number } | null>(null);
  const iconOnly = width < MIN;

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = drag.width + event.clientX - drag.x;
    setWidth(Math.min(MAX, Math.max(COLLAPSED, next)));
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setWidth((current) => {
      if (current < CLOSE_UNDER) return COLLAPSED;
      if (current < MIN) return MIN;
      return current;
    });
  }

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-[rgba(40,70,130,0.35)] bg-[#070A12] ${
        iconOnly ? "overflow-visible" : "overflow-hidden"
      }`}
      style={{ width }}
    >
      <div
        className={
          iconOnly
            ? "flex h-16 items-center justify-center"
            : "flex h-16 items-center gap-3 px-5"
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1E4FD6] p-0.5">
          <Image
            src="/img/MY_preview_rev_1.png"
            alt=""
            width={28}
            height={28}
            className="h-full w-full object-contain mix-blend-screen"
            priority
          />
        </span>
        {iconOnly ? null : (
          <span className="whitespace-nowrap text-base font-semibold tracking-tight text-[#F3F4F6]">
            MoviyAI
          </span>
        )}
      </div>
      <nav
        className={
          iconOnly
            ? "flex flex-1 flex-col items-center gap-1 px-2 py-2"
            : "flex flex-1 flex-col gap-1 px-3 py-2"
        }
      >
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = icons[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                iconOnly
                  ? `group relative flex h-10 w-10 items-center justify-center rounded-lg text-[#F3F4F6] ${
                      active
                        ? "border border-[rgba(40,70,130,0.35)] bg-[#101624]"
                        : ""
                    }`
                  : `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-[#F3F4F6] ${
                      active
                        ? "border border-[rgba(40,70,130,0.35)] bg-[#101624]"
                        : ""
                    }`
              }
            >
              <Icon />
              {iconOnly ? (
                <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-2.5 py-1.5 text-sm font-medium text-[#F3F4F6] group-hover:block group-focus-visible:block">
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-full -translate-y-1/2 border-y-[7px] border-r-[7px] border-y-transparent border-r-[rgba(40,70,130,0.35)]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-[calc(100%-1px)] -translate-y-1/2 border-y-[6px] border-r-[6px] border-y-transparent border-r-[#101624]"
                  />
                  {item.label}
                </span>
              ) : (
                item.label
              )}
            </Link>
          );
        })}
      </nav>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Sidebar kengligi"
        aria-valuenow={width}
        aria-valuemin={COLLAPSED}
        aria-valuemax={MAX}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none"
      />
    </aside>
  );
}
