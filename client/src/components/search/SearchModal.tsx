"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dismissSearchGuide } from "@/api/auth";
import { useAuth } from "@/components/auth/auth-state";
import { CameraIcon, ChevronLeftIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { searchCopy } from "@/data/searchCopy";

const GUIDE_KEY = "moviy-search-guide-understood";
const OPEN_MS = 380;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type SearchOrigin = { x: number; y: number };

type PanelBox = {
  width: number;
  height: number;
  left: number;
  top: number;
  originX: number;
  originY: number;
};

function panelBox(origin: SearchOrigin): PanelBox {
  const width = Math.min(560, window.innerWidth - 48);
  const height = Math.min(680, window.innerHeight - 64);
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  return {
    width,
    height,
    left,
    top,
    originX: origin.x - left,
    originY: origin.y - top,
  };
}

export function SearchModal({
  open,
  origin,
  onClose,
}: {
  open: boolean;
  origin: SearchOrigin | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { profile, requireAuth, replaceProfile } = useAuth();
  const copy = searchCopy(language);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [box, setBox] = useState<PanelBox | null>(null);
  const [guideOn, setGuideOn] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      setShown(false);
      const timer = window.setTimeout(() => setMounted(false), OPEN_MS);
      return () => window.clearTimeout(timer);
    }
    setBox(origin ? panelBox(origin) : null);
    setMounted(true);
    setShown(false);
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setShown(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [open, origin]);

  useEffect(() => {
    if (!shown) return;
    inputRef.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setGuideOn(false);
      return;
    }
    const understood = window.localStorage.getItem(GUIDE_KEY) === "1" || Boolean(profile?.searchGuideUnderstood);
    if (understood) return;
    const timer = window.setTimeout(() => setGuideOn(true), 2000);
    return () => window.clearTimeout(timer);
  }, [open, profile?.searchGuideUnderstood]);

  function onGotIt() {
    if (!requireAuth()) return;
    setGuideOn(false);
    window.localStorage.setItem(GUIDE_KEY, "1");
    void dismissSearchGuide()
      .then((next) => replaceProfile(next))
      .catch(() => undefined);
  }

  if (!portalReady || !mounted) return null;

  const panelStyle = desktop
    ? {
        width: box?.width ?? 560,
        height: box?.height ?? 680,
        left: box?.left ?? 24,
        top: box?.top ?? 32,
        borderRadius: 22,
        transform: shown ? "scale(1, 1)" : "scale(0.08, 0.03)",
        transformOrigin: box ? `${box.originX}px ${box.originY}px` : "top right",
        transition: `transform ${OPEN_MS}ms ${EASE}`,
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
      }
    : {
        transform: shown ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
        transition: `transform ${OPEN_MS}ms ${EASE}`,
      };

  return createPortal(
    <div className={desktop ? "pointer-events-none fixed inset-0 z-[110]" : "fixed inset-0 z-[110]"}>
      {desktop ? (
        <button
          type="button"
          aria-label="Yopish"
          className="pointer-events-auto absolute inset-0"
          style={{ backgroundColor: "#000000", opacity: shown ? 0.45 : 0, transition: `opacity ${OPEN_MS}ms ${EASE}` }}
          onClick={onClose}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Qidiruv"
        className={
          desktop
            ? "pointer-events-auto fixed flex flex-col overflow-hidden border"
            : "absolute inset-0 flex flex-col overflow-hidden"
        }
        style={{ backgroundColor: colors.bg, borderColor: colors.borderSoft, ...panelStyle }}
      >
        <div
          className="z-10 flex items-center gap-2.5 border-b px-3.5 pb-3"
          style={{
            paddingTop: "max(10px, env(safe-area-inset-top))",
            borderColor: colors.borderSoft,
          }}
        >
          <button
            type="button"
            aria-label="Orqaga"
            onClick={onClose}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border"
            style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
          >
            <ChevronLeftIcon size={22} color={colors.icon} />
          </button>
          <div
            className="flex min-h-[42px] min-w-0 flex-1 items-center rounded-full border pr-1.5 pl-3.5"
            style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.placeholder}
              enterKeyHint="search"
              autoCorrect="off"
              autoCapitalize="none"
              className="search-modal-input min-w-0 flex-1 bg-transparent py-2.5 pr-2 text-[16px] font-medium outline-none"
              style={{ color: colors.text, caretColor: colors.accent, ["--search-placeholder" as string]: colors.textMuted }}
            />
            <button type="button" aria-label="Kamera" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <CameraIcon size={28} color={colors.icon} strokeWidth={2.15} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-12">
          <img src="/images/iasearch_preview_rev_1.png" alt="" className="mb-[22px] h-[150px] w-[150px] object-contain" />
          <p className="mb-2.5 text-center text-[13px] font-bold tracking-[0.3px] uppercase" style={{ color: colors.accent }}>
            {copy.aiHelper}
          </p>
          <h2 className="mb-2.5 max-w-[300px] text-center text-[22px] leading-[30px] font-bold" style={{ color: colors.text }}>
            {copy.heroTitle}
          </h2>
          <p className="max-w-[300px] text-center text-[15px] leading-[22px] font-medium" style={{ color: colors.textMuted }}>
            {copy.heroSubtitle}
          </p>
        </div>

        {guideOn ? (
          <div
            className="absolute right-0 left-0 z-30 pr-3.5 pl-[66px]"
            style={{
              top: "calc(env(safe-area-inset-top) + 64px)",
              transformOrigin: "40px 0%",
              animation: "search-guide-in 380ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="pl-7">
              <div className="h-0 w-0 border-x-[9px] border-b-[10px] border-x-transparent" style={{ borderBottomColor: colors.accent }} />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl px-3.5 py-3" style={{ backgroundColor: colors.accent }}>
              <p className="text-[14px] leading-5 font-medium" style={{ color: colors.textOnAccent }}>
                {copy.guideText}
              </p>
              <button
                type="button"
                onClick={onGotIt}
                className="self-end rounded-[14px] px-3.5 py-2 text-[14px] font-bold"
                style={{ backgroundColor: "rgba(255,255,255,0.18)", color: colors.textOnAccent }}
              >
                {copy.guideGotIt}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <style>{`
        .search-modal-input::placeholder { color: var(--search-placeholder); }
        @keyframes search-guide-in {
          from { opacity: 0; transform: scale(0.35, 0.12); }
          to { opacity: 1; transform: scale(1, 1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
