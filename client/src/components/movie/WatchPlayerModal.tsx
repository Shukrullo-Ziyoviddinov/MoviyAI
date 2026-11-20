"use client";
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import { useLanguage } from '@/components/language/language-state';
import { watchModalHistory } from './watch-modal-history';

export function watchLabels(language: string) {
  return language.startsWith('ru') ? { other: 'Смотреть из других источников', site: 'Открыть на сайте', loading: 'Проверяем плеер…', unavailable: 'Встроенный плеер недоступен. Откройте источник.', close: 'Закрыть' }
    : language.startsWith('en') ? { other: 'Watch from other sources', site: 'Open on website', loading: 'Checking player…', unavailable: 'Embedded player unavailable. Open the source.', close: 'Close' }
    : { other: 'Boshqa manbalardan tomosha qilish', site: 'Saytda ochish', loading: 'Player tekshirilmoqda…', unavailable: 'Ichki player ochilmadi. Manba saytida ochishingiz mumkin.', close: 'Yopish' };
}

export function WatchPlayerModal({ url, embedUrl, title, loading, onClose, onOther, hasOther, children }: {
  url: string; embedUrl: string | null; title?: string; loading: boolean; onClose: () => void; onOther: () => void; hasOther: boolean; children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef(onClose);
  const { language } = useLanguage(); const labels = watchLabels(language);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const node = dialog.current; if (!node) return;
    node.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    let release: (() => void) | undefined;
    const timer = window.setTimeout(() => { release = watchModalHistory(() => close.current()); }, 0);
    return () => { window.clearTimeout(timer); node.close(); document.body.style.overflow = previous; release?.(); };
  }, []);
  if (typeof document === 'undefined') return null;
  return createPortal(<dialog ref={dialog} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); event.stopPropagation(); onClose(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-[#05070d] p-0 text-white">
    <div className="flex h-full flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-4 py-3"><h2 className="truncate font-semibold">{title}</h2>
        <button type="button" aria-label={labels.close} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10"><CloseIcon size={22} color="currentColor" /></button></header>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex aspect-video max-h-full w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#111827] p-2 ring-1 ring-inset ring-white/10">
        {embedUrl ? <iframe key={embedUrl} src={embedUrl} title={title || 'Video'} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" className="h-full w-full rounded-md border-0" />
          : <p role="status">{loading ? labels.loading : labels.unavailable}</p>}
        </div>
      </div>
      <footer className="flex w-full items-stretch gap-3 py-4">
        {hasOther && <button type="button" onClick={onOther} className="flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-blue-700 px-3 py-3 text-center text-sm font-semibold md:flex-none md:px-5">{labels.other}</button>}
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClose} className="flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-white/10 px-3 py-3 text-center text-sm md:flex-none md:px-5">{labels.site} ↗</a>
      </footer>{children}
    </div>
  </dialog>, document.body);
}
