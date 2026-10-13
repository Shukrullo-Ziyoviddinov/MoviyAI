"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_WEB_CLIENT_ID, useAuth } from "@/components/auth/auth-state";
import { authCopy } from "@/data/authCopy";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { SHEET_CLOSE_MS, SHEET_EASE, SHEET_OPEN_MS, useSheetMotion } from "@/components/movie/useSheetMotion";

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};

function googleId(): GoogleId | null {
  const google = (window as Window & { google?: { accounts?: { id?: GoogleId } } }).google;
  return google?.accounts?.id ?? null;
}

function loadGoogleScript() {
  if (googleId()) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-google-gsi]");
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("script")), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.googleGsi = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script"));
    document.head.appendChild(script);
  });
}

export function GoogleAuthModal() {
  const { language } = useLanguage();
  const copy = authCopy(language);
  const { colors } = useTheme();
  const { modalOpen, busy, closeAuthModal, loginWithIdToken } = useAuth();
  const sheet = useSheetMotion(modalOpen, closeAuthModal);
  const hostRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef(loginWithIdToken);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  loginRef.current = loginWithIdToken;

  useEffect(() => {
    if (!modalOpen) return;
    setError(GOOGLE_WEB_CLIENT_ID ? null : copy.missingClientId);
    let alive = true;
    loadGoogleScript()
      .then(() => {
        if (alive) setScriptReady(true);
      })
      .catch(() => {
        if (alive) setError(copy.loginFailed);
      });
    return () => {
      alive = false;
    };
  }, [modalOpen, copy.missingClientId, copy.loginFailed]);

  useEffect(() => {
    const host = hostRef.current;
    if (!sheet.mounted || !scriptReady || !host || !GOOGLE_WEB_CLIENT_ID) return;
    const id = googleId();
    if (!id) return;
    host.replaceChildren();
    id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        const idToken = response.credential?.trim() || "";
        if (!idToken) {
          setError(copy.noToken);
          return;
        }
        setError(null);
        loginRef
          .current(idToken)
          .catch(() => setError(copy.loginFailed));
      },
    });
    const width = Math.max(240, Math.round(host.getBoundingClientRect().width));
    id.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width,
    });
  }, [sheet.mounted, scriptReady, copy.noToken, copy.loginFailed]);

  if (!sheet.mounted) return null;

  const motion =
    sheet.dragging || !sheet.ready
      ? "none"
      : `transform ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}, opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`;

  return (
    <div className={`fixed inset-0 z-[120] flex ${sheet.desktop ? "items-center justify-center p-6" : "items-end"}`}>
      <button
        type="button"
        aria-label={copy.later}
        ref={sheet.bindBackdrop}
        className="absolute inset-0 border-0 bg-black"
        style={{
          opacity: sheet.backdrop,
          transition: sheet.dragging || !sheet.ready ? "none" : `opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`,
        }}
        onClick={closeAuthModal}
      />
      <div
        ref={sheet.bindSheet}
        className={
          sheet.desktop
            ? "relative w-full max-w-[420px] overflow-hidden rounded-3xl border"
            : "relative w-full overflow-hidden rounded-t-3xl border-t"
        }
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
          paddingBottom: sheet.desktop ? 20 : "max(16px, env(safe-area-inset-bottom))",
          transform: sheet.transform,
          opacity: sheet.desktop ? (sheet.shown ? 1 : 0) : 1,
          transition: motion,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {sheet.desktop ? null : (
          <div className="px-5 pt-2.5 pb-1 select-none" style={{ touchAction: "none" }} {...sheet.dragHandlers}>
            <div className="mx-auto h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
          </div>
        )}
        <div className="flex flex-col gap-3 px-5 pt-2">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white">
              <img src="/images/google-logo.png" alt="" className="h-[26px] w-[26px] object-contain" />
            </span>
            <h2 className="min-w-0 flex-1 text-[22px] leading-7 font-extrabold" style={{ color: colors.text }}>
              {copy.title}
            </h2>
          </div>
          <p className="text-[15px] leading-[22px]" style={{ color: colors.textMuted }}>
            {copy.subtitle}
          </p>
          <div className="relative mt-2 min-h-[54px]">
            <div
              className="flex min-h-[54px] items-center justify-center gap-3 rounded-[14px] border px-4"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.borderSoft,
                opacity: busy || !scriptReady ? 0.7 : 1,
              }}
            >
              {busy ? (
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
                  style={{ color: colors.accentBright }}
                />
              ) : (
                <>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white">
                    <img src="/images/google-logo.png" alt="" className="h-[18px] w-[18px] object-contain" />
                  </span>
                  <span className="text-[16px] font-bold" style={{ color: colors.text }}>
                    {copy.continueGoogle}
                  </span>
                </>
              )}
            </div>
            <div
              ref={hostRef}
              className="absolute inset-0 z-10 overflow-hidden opacity-[0.011] [&_div]:!h-full [&_div]:!w-full [&_iframe]:!h-full [&_iframe]:!max-w-none [&_iframe]:!w-full"
              style={{ pointerEvents: busy ? "none" : "auto" }}
            />
          </div>
          {error ? <p className="text-center text-[13px] font-semibold text-[#EF4444]">{error}</p> : null}
          <p className="text-center text-[13px] leading-[18px]" style={{ color: colors.textMuted }}>
            {copy.hint}
          </p>
          <button type="button" className="self-center py-2 text-[14px] font-bold" style={{ color: colors.accentBright }} onClick={closeAuthModal}>
            {copy.later}
          </button>
        </div>
      </div>
    </div>
  );
}
