"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchFromMedia, mediaKind, readSearchHistory } from '@/api/media-search';
import type { MovieSearchResult } from '@/types/chat';
import type { ChatStage } from '@/types/chat-progress';
import { useTheme } from '@/components/theme/theme-state';
import { useLanguage } from '@/components/language/language-state';
import { useT } from '@/i18n/useT';
import { UzbekMovieLinks } from '@/components/chat/UzbekMovieLinks';
import { CloseIcon } from '@/components/icons';
import { SHEET_OPEN_MS, SHEET_CLOSE_MS, SHEET_EASE, useSheetMotion } from '@/components/movie/useSheetMotion';

export function SearchMediaResultModal({ file, historyId, onClose }: { file?: File; historyId?: string; onClose: () => void }) {
  const { colors } = useTheme(); const { language } = useLanguage(); const t = useT();
  const [shown, setShown] = useState(false), [preview, setPreview] = useState('');
  const [movie, setMovie] = useState<MovieSearchResult | null>(null), [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<ChatStage>('preparing'), [attempt, setAttempt] = useState(0);
  const requestId = useRef(crypto.randomUUID());
  const closing = useRef(false);
  const { bindBackdrop, bindSheet, desktop, backdrop, dragging, ready, transform, dragHandlers } = useSheetMotion(shown, close);
  const controller = useRef<AbortController | null>(null), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedKind, setSavedKind] = useState<'image' | 'video'>('image');
  useEffect(() => { const url = file ? URL.createObjectURL(file) : ''; const frame = requestAnimationFrame(() => { if (url) setPreview(url); setShown(true); }); return () => { if (url) URL.revokeObjectURL(url); cancelAnimationFrame(frame); if (closeTimer.current) clearTimeout(closeTimer.current); }; }, [file]);
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const work = historyId ? readSearchHistory(historyId, abort.signal).then(saved => {
      if (!abort.signal.aborted) { setPreview(saved.media.url); setSavedKind(saved.media.kind); }
      return saved.movie;
    }) : file ? searchFromMedia(file, requestId.current, language, abort.signal, value => { if (!abort.signal.aborted) setStage(value); }) : Promise.reject(new Error('Missing media'));
    work
      .then(result => { if (!abort.signal.aborted) { setMovie(result); setError(null); } })
      .catch(cause => { if (!abort.signal.aborted) setError(cause.failureCode === 'invalid_media' ? t('mediaSearch.invalid') : t(`chat.failures.${cause.name === 'TimeoutError' ? 'timeout' : cause.failureCode || 'unknown'}`)); });
    return () => abort.abort();
    // Keep a submitted request in its original language when app settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, historyId, attempt]);
  function close() { if (closing.current) return; closing.current = true; controller.current?.abort(); setShown(false); closeTimer.current = setTimeout(onClose, window.matchMedia('(min-width: 768px)').matches ? 280 : SHEET_CLOSE_MS); }
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) close(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); });
  return createPortal(<div className="fixed inset-0 z-[160] flex items-end justify-center md:items-center" style={{ paddingTop: 'var(--tg-chrome, 0px)' }}>
    <button ref={bindBackdrop} aria-label={t('common.close')} className="absolute inset-0 bg-black/65 transition-opacity duration-300" style={{ opacity: desktop ? shown ? 1 : 0 : backdrop / 0.65, transition: desktop ? undefined : dragging || !ready ? 'none' : `opacity ${shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}` }} onClick={close} />
    <section ref={bindSheet} role="dialog" aria-modal="true" aria-label={t('mediaSearch.heading')} className={`relative flex max-h-[85%] w-full flex-col overflow-hidden rounded-t-3xl border shadow-2xl transition-[transform,opacity] duration-300 md:max-h-[85%] md:w-[min(700px,92vw)] md:rounded-3xl ${shown ? 'md:translate-y-0 md:opacity-100' : 'md:translate-y-4 md:opacity-0'}`} style={{ backgroundColor: colors.bg, borderColor: colors.borderSoft, transform: desktop ? undefined : transform, transition: desktop ? undefined : dragging || !ready ? 'none' : `transform ${shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}` }}>
      <div className="shrink-0 px-4 pt-2.5 pb-2 select-none md:hidden" style={{ touchAction: 'none' }} {...dragHandlers}>
        <div className="mx-auto h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
      </div>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: colors.borderSoft, color: colors.text }}>
        <h2 className="text-lg font-bold">{t('mediaSearch.heading')}</h2>
        <button onClick={close} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.panelSoft }}><CloseIcon size={22} color={colors.text} /></button>
      </header>
      <div className="min-h-0 overflow-y-auto p-4 pb-[max(20px,var(--app-bottom-inset,env(safe-area-inset-bottom)))]">
        {preview && ((file ? mediaKind(file) : savedKind) === 'video' ? <video src={preview} controls playsInline preload="metadata" className="mx-auto max-h-52 w-full rounded-2xl bg-black object-contain" /> : <img src={preview} alt={t('mediaSearch.selected')} className="mx-auto max-h-52 w-full rounded-2xl object-contain" />)}
        {!movie && !error && <div role="status" className="flex items-center justify-center gap-3 py-8" style={{ color: colors.textMuted }}><span className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent" />{t(`chat.progress.${stage}`)}…</div>}
        {error && <div role="alert" className="space-y-3 py-6 text-center" style={{ color: colors.text }}><p>{error}</p><button className="rounded-xl px-5 py-3" style={{ backgroundColor: colors.panelSoft }} onClick={() => { setError(null); setAttempt(value => value + 1); }}>{t('chat.retry')}</button></div>}
        {movie && <div className="pt-5">
          <h3 className="text-xl font-bold" style={{ color: colors.text }}>{movie.titleUz || movie.title}{movie.year ? ` (${movie.year})` : ''}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">{movie.posters.slice(0, 2).map(poster => <img key={poster.url} src={poster.url} alt={movie.title} loading="lazy" className="aspect-[2/3] w-full rounded-xl object-cover" />)}</div>
          <UzbekMovieLinks links={movie.uzbekLinks} />
          {!movie.uzbekLinks?.length && <p className="mt-4 text-sm" style={{ color: colors.textMuted }}>{t('mediaSearch.noLinks')}</p>}
        </div>}
      </div>
    </section>
  </div>, document.body);
}
