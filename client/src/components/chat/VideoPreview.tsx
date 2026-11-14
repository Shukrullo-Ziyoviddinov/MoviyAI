"use client";

import { useEffect, useRef, useState } from 'react';
import { useTelegramChrome } from '@/components/telegram/TelegramFullscreen';
import { videoPoster } from '@/media/video-poster';

export function VideoPreview({ uri, className }: { uri: string; className?: string }) {
  const { active: telegram } = useTelegramChrome();
  const target = useRef<HTMLDivElement>(null);
  const [poster, setPoster] = useState<{ uri: string; image: string } | null>(null);
  useEffect(() => {
    const platform = window.Telegram?.WebApp?.platform;
    if (!telegram && (!platform || platform === 'unknown')) return;
    let cancelled = false;
    let started = false;
    const prepare = () => {
      if (started) return;
      started = true;
      void videoPoster(uri).then(image => { if (!cancelled && image) setPoster({ uri, image }); });
    };
    const node = target.current;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); prepare(); }
    }, { rootMargin: '100px' });
    if (node && observer) observer.observe(node); else prepare();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [telegram, uri]);
  const image = poster?.uri === uri ? poster.image : undefined;
  return <div ref={target} className={className}>
    {image ? <img src={image} alt="" className="h-full w-full object-cover" />
      : <video src={uri} className="h-full w-full object-cover" muted playsInline preload="metadata" />}
  </div>;
}
