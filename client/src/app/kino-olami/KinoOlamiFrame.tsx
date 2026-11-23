"use client";

import { useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/nav/BottomNav";

export function KinoOlamiFrame({ embedUrl }: { embedUrl: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const embedOrigin = new URL(embedUrl).origin;

    function handleShareMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const isKinoRedirect = embedOrigin === "https://kino-olami.uz" &&
        event.origin === "https://www.kino-olami.uz";
      if (event.origin !== embedOrigin && !isKinoRedirect) return;
      if (event.data?.type !== "kino-olami:share-modal" || typeof event.data.open !== "boolean") return;
      setShareOpen(event.data.open);
    }

    window.addEventListener("message", handleShareMessage);
    return () => window.removeEventListener("message", handleShareMessage);
  }, [embedUrl]);

  return (
    <>
      <iframe
        ref={frameRef}
        src={embedUrl}
        title="Kino olami"
        className={`min-h-0 w-full flex-1 border-0${shareOpen ? " relative z-[51] md:z-auto" : ""}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => setShareOpen(false)}
      />
      <div inert={shareOpen}>
        <BottomNav />
      </div>
    </>
  );
}
