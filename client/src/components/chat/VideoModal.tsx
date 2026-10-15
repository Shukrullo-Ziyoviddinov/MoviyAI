"use client";

import { useEffect, useRef, useState } from "react";
import { HEADER_ROW_HEIGHT } from "@/components/chat/ChatHeader";
import { VideoPlaybackBar } from "@/components/chat/VideoPlaybackBar";
import { useChat } from "@/components/chat/chat-state";
import { useTheme } from "@/components/theme/theme-state";
import type { ChatMediaItem } from "@/types/chat";

function fitBox(width: number, height: number, maxW: number, maxH: number) {
  const ratio = width / Math.max(height, 1);
  let displayW = Math.min(width, maxW);
  let displayH = displayW / ratio;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * ratio;
  }
  return { w: Math.max(1, Math.round(displayW)), h: Math.max(1, Math.round(displayH)) };
}

export function VideoModal() {
  const { viewer } = useChat();
  if (!viewer || viewer.type !== "video") return null;
  return <VideoModalPlayer key={viewer.uri} item={viewer} />;
}

function VideoModalPlayer({ item }: { item: ChatMediaItem }) {
  const { colors } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState({ w: 360, h: 240 });

  useEffect(() => {
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight - HEADER_ROW_HEIGHT - 120;
    if (item.width && item.height) {
      setSize(fitBox(item.width, item.height, maxW, maxH));
      return;
    }
    setSize({ w: Math.round(maxW * 0.85), h: Math.round(maxH * 0.55) });
  }, [item.height, item.width]);

  function onToggle() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.duration && video.currentTime >= video.duration - 0.2) {
      video.currentTime = 0;
    }
    void video.play();
  }

  return (
    <div className="absolute inset-0 z-[25] flex items-center justify-center px-4" style={{ backgroundColor: colors.bgDeep }}>
      <div>
        <video
          ref={videoRef}
          src={item.uri}
          className="rounded-xl bg-black object-contain"
          style={{ width: size.w, height: size.h }}
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedData={(event) => {
            const video = event.currentTarget;
            if (video.currentTime < 0.01) video.currentTime = 0.05;
          }}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        />
        <div style={{ width: size.w }}>
          <VideoPlaybackBar
            playing={playing}
            current={current}
            duration={duration}
            onToggle={onToggle}
            onSeek={(time) => {
              const video = videoRef.current;
              if (!video) return;
              video.currentTime = time;
              setCurrent(time);
            }}
          />
        </div>
      </div>
    </div>
  );
}
