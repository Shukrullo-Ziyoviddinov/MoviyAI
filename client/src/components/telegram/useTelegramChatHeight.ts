"use client";
import { useEffect, useState } from 'react';
import { telegramChatHeight } from './telegram-chat-viewport';

export function useTelegramChatHeight(active: boolean) {
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!active) return;
    const tg = window.Telegram?.WebApp; if (!tg) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHeight(telegramChatHeight(tg, window.innerHeight, viewport) || undefined));
    };
    update();
    tg.onEvent?.('viewportChanged', update);
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      tg.offEvent?.('viewportChanged', update);
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [active]);
  return active ? height : undefined;
}
