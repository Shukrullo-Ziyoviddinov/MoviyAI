"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme/theme-state";

type TelegramWebApp = {
  platform?: string;
  isFullscreen?: boolean;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function TelegramFullscreen() {
  const { colors } = useTheme();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.platform || tg.platform === "unknown") return;

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.(colors.bg);
    tg.setBackgroundColor?.(colors.bg);
    tg.setBottomBarColor?.(colors.bg);
    document.documentElement.style.backgroundColor = colors.bg;
    if (!tg.isFullscreen) tg.requestFullscreen?.();
  }, [colors.bg]);

  return null;
}
