"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "@/api/client";
import { useAuth } from "@/components/auth/auth-state";
import { BottomNav } from "@/components/nav/BottomNav";

export function KinoOlamiFrame({ embedUrl }: { embedUrl: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [frameOrigin, setFrameOrigin] = useState("");
  const [sessionRevision, setSessionRevision] = useState(0);
  const { token, ready, openAuthModal } = useAuth();
  const [sessionError, setSessionError] = useState(false);
  const frameUrl = new URL(embedUrl);
  const configuredOrigin = frameUrl.origin;
  const allowedOrigin = useCallback((origin: string) => origin === configuredOrigin ||
    (configuredOrigin === "https://kino-olami.uz" && origin === "https://www.kino-olami.uz"), [configuredOrigin]);

  const send = useCallback((message: object, origin = frameOrigin) => {
    if (origin) frameRef.current?.contentWindow?.postMessage(message, origin);
  }, [frameOrigin]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow || !allowedOrigin(event.origin)) return;
      const message = event.data;
      if (message?.type === "kino-olami:share-modal" && typeof message.open === "boolean") setShareOpen(message.open);
      if (message?.type === "kino-olami:ready") setFrameOrigin(event.origin);
      if (message?.type === "kino-olami:page" && typeof message.wishlist === "boolean") setWishlist(message.wishlist);
      if (message?.type === "kino-olami:linked" || message?.type === "kino-olami:refresh-session") setSessionRevision((value) => value + 1);
      if (message?.type === "kino-olami:login-required") {
        if (ready && !token) openAuthModal();
        if (token && sessionError) setSessionRevision((value) => value + 1);
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [allowedOrigin, openAuthModal, ready, sessionError, token]);

  useEffect(() => {
    if (!frameOrigin) return;
    if (!token || !ready) {
      send({ type: "moviyai:kino-session", token: null });
      return;
    }
    const controller = new AbortController();
    let request = 0;
    async function refresh() {
      const revision = ++request;
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/kino-session`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || typeof result.data?.token !== "string") throw new Error("Session unavailable");
        if (!controller.signal.aborted && revision === request) {
          setSessionError(false);
          send({ type: "moviyai:kino-session", token: result.data.token });
        }
      } catch {
        if (!controller.signal.aborted && revision === request) setSessionError(true);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      send({ type: "moviyai:kino-session", token: null });
    };
  }, [frameOrigin, ready, send, sessionRevision, token]);

  return (
    <>
      <iframe
        ref={frameRef}
        src={frameUrl.href}
        title="Kino olami"
        className={`min-h-0 w-full flex-1 border-0${shareOpen ? " relative z-[51] md:z-auto" : ""}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          setShareOpen(false);
          send({ type: "moviyai:hello" }, configuredOrigin);
          if (allowedOrigin("https://www.kino-olami.uz") && configuredOrigin !== "https://www.kino-olami.uz") {
            send({ type: "moviyai:hello" }, "https://www.kino-olami.uz");
          }
          setSessionRevision((value) => value + 1);
        }}
      />
      <div inert={shareOpen}>
        <BottomNav kino={{ wishlist, open: (page) => send({ type: "moviyai:kino-page", page }) }} />
      </div>
    </>
  );
}