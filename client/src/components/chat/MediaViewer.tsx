"use client";

import { useEffect, useState } from "react";
import { HEADER_ROW_HEIGHT } from "@/components/chat/ChatHeader";
import { useChat } from "@/components/chat/chat-state";
import { useTheme } from "@/components/theme/theme-state";

export function MediaViewer() {
  const { colors } = useTheme();
  const { viewer, closeViewer } = useChat();
  const [size, setSize] = useState({ w: 320, h: 240 });

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, closeViewer]);

  useEffect(() => {
    if (!viewer) return;
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight - HEADER_ROW_HEIGHT - 40;
    const image = new Image();
    image.onload = () => {
      const ratio = image.naturalWidth / image.naturalHeight || 1;
      let displayW = Math.min(image.naturalWidth, maxW);
      let displayH = displayW / ratio;
      if (displayH > maxH) {
        displayH = maxH;
        displayW = displayH * ratio;
      }
      setSize({ w: displayW, h: displayH });
    };
    image.onerror = () => setSize({ w: maxW * 0.85, h: maxH * 0.55 });
    image.src = viewer.uri;
  }, [viewer]);

  if (!viewer || viewer.type !== "image") return null;

  return (
    <div className="absolute inset-0 z-[25] flex items-center justify-center" style={{ backgroundColor: colors.bgDeep }}>
      <img
        src={viewer.uri}
        alt=""
        className="rounded-xl object-contain"
        style={{ width: size.w, height: size.h }}
      />
    </div>
  );
}
