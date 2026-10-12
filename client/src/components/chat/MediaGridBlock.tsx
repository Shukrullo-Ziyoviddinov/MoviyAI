"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useChat } from "@/components/chat/chat-state";
import { colors } from "@/constants/theme";
import type { ChatMediaItem } from "@/types/chat";

const GAP = 3;
const MEDIA_MAX_W = 360;
const VIDEO_MAX_H = 460;
const IMAGE_MAX_H = 280;

function fitBox(width: number, height: number, maxW: number, maxH: number) {
  const ratio = width / Math.max(height, 1);
  let displayW = Math.min(width, maxW);
  let displayH = displayW / ratio;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * ratio;
  }
  if (displayW > maxW) {
    displayW = maxW;
    displayH = displayW / ratio;
  }
  return { w: Math.max(1, Math.round(displayW)), h: Math.max(1, Math.round(displayH)) };
}

function MediaCell({ item, style }: { item: ChatMediaItem; style?: CSSProperties }) {
  const { openViewer } = useChat();
  const media =
    item.type === "video" ? (
      <video src={item.uri} className="absolute inset-0 h-full w-full object-cover" muted />
    ) : (
      <img src={item.uri} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );

  return (
    <button
      type="button"
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#111827]"
      style={style}
      onClick={() => openViewer(item)}
    >
      {media}
      {item.type === "video" ? (
        <span className="absolute bottom-1.5 left-1.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
          VIDEO
        </span>
      ) : null}
    </button>
  );
}

function SingleMedia({ item }: { item: ChatMediaItem }) {
  const [size, setSize] = useState({ w: 180, h: 180 });

  useEffect(() => {
    const maxW = Math.min(window.innerWidth * 0.72, MEDIA_MAX_W);
    const maxH = item.type === "video" ? VIDEO_MAX_H : IMAGE_MAX_H;
    if (item.width && item.height) {
      setSize(fitBox(item.width, item.height, maxW, maxH));
      return;
    }
    if (item.type === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => setSize(fitBox(video.videoWidth, video.videoHeight, maxW, maxH));
      video.src = item.uri;
      return;
    }
    const image = new Image();
    image.onload = () => setSize(fitBox(image.naturalWidth, image.naturalHeight, maxW, maxH));
    image.onerror = () => setSize({ w: Math.round(maxW * 0.7), h: 180 });
    image.src = item.uri;
  }, [item.height, item.type, item.uri, item.width]);

  return (
    <div className="overflow-hidden rounded-2xl" style={{ width: size.w, height: size.h, backgroundColor: colors.panelSoft }}>
      <MediaCell item={item} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export function MediaGridBlock({ items }: { items: ChatMediaItem[] }) {
  const blockW = typeof window === "undefined" ? 320 : Math.min(window.innerWidth * 0.78, 320);

  if (items.length === 1 || items.every((item) => item.type === "video")) {
    return (
      <div className="mb-2.5 flex w-full justify-end px-3.5">
        <div className="flex flex-col items-end gap-2">
          {items.map((item) => (
            <SingleMedia key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 2) {
    const cellW = (blockW - GAP) / 2;
    return (
      <div className="mb-2.5 flex w-full justify-end px-3.5">
        <div className="flex h-[168px] overflow-hidden rounded-2xl" style={{ width: blockW, backgroundColor: colors.panelSoft }}>
          <MediaCell item={items[0]} style={{ width: cellW, height: 168 }} />
          <div style={{ width: GAP }} />
          <MediaCell item={items[1]} style={{ width: cellW, height: 168 }} />
        </div>
      </div>
    );
  }

  if (items.length === 3) {
    return (
      <div className="mb-2.5 flex w-full justify-end px-3.5">
        <div className="flex h-[220px] overflow-hidden rounded-2xl" style={{ width: blockW, backgroundColor: colors.panelSoft }}>
          <MediaCell item={items[0]} style={{ flex: 1.05 }} />
          <div style={{ width: GAP }} />
          <div className="flex flex-col" style={{ flex: 0.95, gap: GAP }}>
            <MediaCell item={items[1]} style={{ flex: 1 }} />
            <MediaCell item={items[2]} style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    );
  }

  const cell = (blockW - GAP) / 2;
  return (
    <div className="mb-2.5 flex w-full justify-end px-3.5">
      <div
        className="grid overflow-hidden rounded-2xl"
        style={{
          width: blockW,
          height: cell * 2 + GAP,
          gridTemplateColumns: `${cell}px ${cell}px`,
          gap: GAP,
          backgroundColor: colors.panelSoft,
        }}
      >
        {items.slice(0, 4).map((item) => (
          <MediaCell key={item.id} item={item} style={{ width: cell, height: cell }} />
        ))}
      </div>
    </div>
  );
}
