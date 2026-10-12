"use client";

import { colors } from "@/constants/theme";
import type { ChatMediaItem } from "@/types/chat";

export function SelectedMediaStrip({
  items,
  onRemove,
}: {
  items: ChatMediaItem[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      data-media-strip
      className="no-scrollbar mb-3 flex max-h-[84px] gap-2.5 overflow-x-auto overscroll-x-contain pr-1"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
        >
          {item.type === "video" ? (
            <video src={item.uri} className="h-full w-full object-cover" muted />
          ) : (
            <img src={item.uri} alt="" className="h-full w-full object-cover" />
          )}
          {item.type === "video" ? (
            <span className="absolute bottom-1.5 left-1.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">
              VIDEO
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Olib tashlash"
            onClick={() => onRemove(item.id)}
            className="absolute top-1 right-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/25 bg-black/70 text-white"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1" y1="1" x2="9" y2="9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
