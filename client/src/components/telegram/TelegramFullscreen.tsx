"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme/theme-state";

type Chrome = { active: boolean; back: number };

const ChromeContext = createContext<Chrome>({ active: false, back: 0 });

export function useTelegramChrome() {
  return useContext(ChromeContext);
}

type Insets = { top?: number };

type TelegramWebApp = {
  platform?: string;
  isFullscreen?: boolean;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function readBack(tg: TelegramWebApp) {
  const safe = tg.safeAreaInset?.top ?? 0;
  const content = tg.contentSafeAreaInset?.top ?? 0;
  return Math.max(safe + content, 48);
}

export function TelegramChromeProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [chrome, setChrome] = useState<Chrome>({ active: false, back: 0 });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const narrow = window.matchMedia("(max-width: 767px)");
    if (!tg || !tg.platform || tg.platform === "unknown") return;

    const clear = () => {
      const root = document.documentElement;
      root.style.removeProperty("--tg-back");
      root.style.removeProperty("--tg-chrome");
      root.style.removeProperty("--tg-safe-pad");
      root.style.removeProperty("--tg-home-gap");
      setChrome({ active: false, back: 0 });
    };

    const apply = () => {
      if (!narrow.matches) {
        clear();
        return;
      }
      const back = readBack(tg);
      const root = document.documentElement;
      root.style.setProperty("--tg-back", `${back}px`);
      root.style.setProperty("--tg-chrome", `${back}px`);
      root.style.setProperty("--tg-safe-pad", "0px");
      root.style.setProperty("--tg-home-gap", "8px");
      setChrome({ active: true, back });
    };

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.(colors.panel);
    tg.setBackgroundColor?.(colors.bg);
    tg.setBottomBarColor?.(colors.bg);
    document.documentElement.style.backgroundColor = colors.bg;
    if (!tg.isFullscreen) tg.requestFullscreen?.();
    apply();

    const events = ["fullscreenChanged", "safeAreaChanged", "contentSafeAreaChanged", "viewportChanged"];
    for (const event of events) tg.onEvent?.(event, apply);
    narrow.addEventListener("change", apply);
    return () => {
      clear();
      narrow.removeEventListener("change", apply);
      for (const event of events) tg.offEvent?.(event, apply);
    };
  }, [colors.bg]);

  return <ChromeContext.Provider value={chrome}>{children}</ChromeContext.Provider>;
}

export function TelegramNav() {
  const { active } = useTelegramChrome();
  const { colors } = useTheme();
  if (!active) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] md:hidden"
      style={{
        height: "var(--tg-back, 48px)",
        backgroundColor: colors.panel,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
      }}
    />
  );
}
