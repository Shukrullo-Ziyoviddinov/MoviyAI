"use client";

import { useState } from "react";
import { colors } from "@/constants/theme";

type VideoPlaybackBarProps = {
  playing: boolean;
  current: number;
  duration: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
};

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function VideoPlaybackBar({
  playing,
  current,
  duration,
  onToggle,
  onSeek,
}: VideoPlaybackBarProps) {
  const [trackW, setTrackW] = useState(1);
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <div className="mt-3.5 flex items-center gap-2.5">
      <button
        type="button"
        aria-label={playing ? "Pauza" : "Play"}
        onClick={onToggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.accent }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2" y="1.5" width="3.2" height="11" rx="1" fill={colors.textOnAccent} />
            <rect x="8.8" y="1.5" width="3.2" height="11" rx="1" fill={colors.textOnAccent} />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3.2 1.8L12 7L3.2 12.2V1.8Z" fill={colors.textOnAccent} />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label="Davomiylik"
        className="relative h-7 min-w-0 flex-1"
        onClick={(event) => {
          if (duration <= 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          onSeek(ratio * duration);
        }}
        ref={(node) => {
          if (node) setTrackW(node.clientWidth);
        }}
      >
        <span className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-white/30" />
        <span
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full"
          style={{ width: `${progress * 100}%`, backgroundColor: colors.accent }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{ left: Math.max(0, progress * trackW - 6), backgroundColor: colors.textOnAccent }}
        />
      </button>
      <span className="min-w-[78px] text-xs font-semibold" style={{ color: colors.text }}>
        {formatTime(current)} / {formatTime(duration)}
      </span>
    </div>
  );
}
