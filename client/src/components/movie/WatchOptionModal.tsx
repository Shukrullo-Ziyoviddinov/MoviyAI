"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, PlayIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { watchModalHistory } from './watch-modal-history';
import { translate } from "@/i18n";
import { watchOptions } from "@/utils/watch-options";

type WatchMovie = { watchUrl?: string | null; watchUrls?: string[] };

export function WatchOptionModal({ open, onClose, movie, title }: {
  open: boolean; onClose: () => void; movie: WatchMovie; title?: string;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLButtonElement>(null);
  const version = useRef(0);
  const scrollOverflow = useRef<string | null>(null);
  const drag = useRef<{ y: number; time: number; distance: number } | null>(null);
  const releaseHistory = useRef<(() => void) | null>(null);
  const alive = useRef(true);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) { releaseHistory.current?.(); return; }
    // Defer registration so Strict Mode's setup/cleanup check cannot pop history.
    const timer = window.setTimeout(() => {
      if (!releaseHistory.current) releaseHistory.current = watchModalHistory(() => {
        releaseHistory.current = null;
        if (alive.current) closeRef.current();
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    const node = dialog.current, sheet = panel.current, shade = backdrop.current;
    if (!node || !sheet || !shade || (!open && !node.open)) return;
    const token = ++version.current;
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    const currentTransform = getComputedStyle(sheet).transform;
    const currentOpacity = getComputedStyle(shade).opacity;
    const currentPanelOpacity = getComputedStyle(sheet).opacity;
    const alreadyOpen = node.open;
    sheet.getAnimations().forEach(animation => animation.cancel());
    shade.getAnimations().forEach(animation => animation.cancel());
    if (open && !alreadyOpen) node.showModal();
    if (open) {
      scrollOverflow.current ??= document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const hidden = desktop ? 'scale(0.96)' : 'translateY(100%)';
    const animations = [sheet.animate([
      { transform: open && !alreadyOpen ? hidden : currentTransform, opacity: desktop && open && !alreadyOpen ? 0 : currentPanelOpacity },
      { transform: open ? 'translateY(0) scale(1)' : hidden, opacity: desktop && !open ? 0 : 1 },
    ], { duration: open ? 320 : 240, easing: 'cubic-bezier(0.33,1,0.68,1)', fill: 'forwards' }),
    shade.animate([{ opacity: open && !alreadyOpen ? 0 : currentOpacity }, { opacity: open ? 0.55 : 0 }],
      { duration: open ? 320 : 240, easing: 'ease-out', fill: 'forwards' })];
    if (!open) void Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (token === version.current) {
        node.close();
        if (scrollOverflow.current !== null) document.body.style.overflow = scrollOverflow.current;
        scrollOverflow.current = null;
      }
    }).catch(() => {});
  }, [open]);
  useEffect(() => {
    alive.current = true;
    const animationVersion = version;
    return () => {
      alive.current = false;
      ++animationVersion.current;
      releaseHistory.current?.();
      if (scrollOverflow.current !== null) document.body.style.overflow = scrollOverflow.current;
      scrollOverflow.current = null;
    };
  }, []);
  const options = watchOptions(movie);
  if (typeof document === 'undefined') return null;
  const closeLabel = translate(language, 'common.close');
  const endDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const state = drag.current;
    drag.current = null;
    if (!state || !panel.current || !backdrop.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const distance = state.distance;
    if (!cancelled && (distance > panel.current.offsetHeight * 0.2 || distance / Math.max(performance.now() - state.time, 1) > 0.8)) {
      onClose();
    } else {
      panel.current.animate([{ transform: 'translateY(' + distance + 'px)' }, { transform: 'translateY(0)' }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' });
      backdrop.current.animate([{ opacity: getComputedStyle(backdrop.current).opacity }, { opacity: 0.55 }],
        { duration: 200, fill: 'forwards' });
    }
  };
  return createPortal(<dialog ref={dialog} aria-label={translate(language, 'movie.watchOptionsTitle')}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent">
    <button ref={backdrop} type="button" onClick={onClose} aria-label={closeLabel} className="absolute inset-0 bg-black opacity-0" />
    <div ref={panel} role="document" className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col overflow-hidden rounded-t-[22px] border md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[480px] md:max-w-[calc(100%_-_48px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 select-none md:pt-4" style={{ touchAction: 'none' }}
        onPointerDown={event => {
          if (!open || event.button !== 0 || window.matchMedia('(min-width: 768px)').matches) return;
          drag.current = { y: event.clientY, time: performance.now(), distance: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const state = drag.current, sheet = panel.current, shade = backdrop.current;
          if (!state || !sheet || !shade) return;
          const distance = Math.max(0, event.clientY - state.y);
          if (distance < 4 && !state.distance) return;
          state.distance = distance;
          sheet.getAnimations().forEach(animation => animation.cancel());
          shade.getAnimations().forEach(animation => animation.cancel());
          sheet.style.transform = 'translateY(' + distance + 'px)';
          shade.style.opacity = String(0.55 * Math.max(0, 1 - distance / sheet.offsetHeight));
        }}
        onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)}>
        <div className="min-w-0 flex-1">
          <div className="mx-auto mb-3 h-1 w-[42px] rounded-full md:hidden" style={{ backgroundColor: colors.border }} />
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>{translate(language, 'movie.watchOptionsTitle')}</h2>
          {title && <p className="mt-1 truncate text-sm" style={{ color: colors.textMuted }}>{title}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full md:flex">
          <CloseIcon size={22} color={colors.icon} />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {options.map(option => <a key={option.url} href={option.url} target="_blank" rel="noopener noreferrer" onClick={onClose}
          className="mb-2 flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}>
          <PlayIcon size={20} color={colors.accentBright} />
          <span className="min-w-0 flex-1"><span className="block font-semibold">{option.domain}</span>
            <span className="block truncate text-xs" style={{ color: colors.textMuted }}>{new URL(option.url).pathname}</span>
          </span><span aria-hidden="true">{'\u2197'}</span>
        </a>)}
      </div>
    </div>
  </dialog>, document.body);
}

export function WatchButton({ movie, title, children, className, style }: {
  movie: WatchMovie; title?: string; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const options = watchOptions(movie);
  if (options.length === 1) return <a href={options[0].url} target="_blank" rel="noopener noreferrer" className={className} style={style}>{children}</a>;
  return <>
    <button type="button" disabled={!options.length} onClick={() => setOpen(true)} className={className}
      style={{ ...style, ...(!options.length ? { opacity: 0.6 } : {}) }}>{children}</button>
    <WatchOptionModal open={open} onClose={() => setOpen(false)} movie={movie} title={title} />
  </>;
}
