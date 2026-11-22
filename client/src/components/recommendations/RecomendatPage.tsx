"use client";

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MovieSection } from '@/api/movie-sections';
import { fetchWishlistIds, toggleWishlistMovie } from '@/api/wishlist';
import { ChevronLeftIcon } from '@/components/icons';
import { useAuth } from '@/components/auth/auth-state';
import { useLanguage } from '@/components/language/language-state';
import { useTheme } from '@/components/theme/theme-state';
import { categoryTitle } from '@/data/homeMovies';
import { translate } from '@/i18n';
import { useMovieSection } from '@/hooks/useMovieSection';
import { MovieSectionGrid } from './MovieSectionGrid';

export function RecomendatPage({ category }: { category: MovieSection }) {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const { token, requireAuth } = useAuth();
  const { items, loading, loaded, hasMore, error, pager } = useMovieSection(category);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const busySaves = useRef(new Set<number>());
  const root = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    let alive = true;
    fetchWishlistIds().then(ids => { if (alive) setSavedIds(ids); }).catch(() => { if (alive) setSavedIds([]); });
    return () => { alive = false; };
  }, [token]);

  useLayoutEffect(() => {
    if (loaded && !restored.current && root.current) {
      root.current.scrollTop = pager.getScrollTop();
      restored.current = true;
    }
  }, [loaded, pager]);

  useEffect(() => {
    if (!loaded || loading || error || !hasMore || !sentinel.current || !root.current) return;
    // The page scrolls inside AppShell; window is not its scroll container.
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void pager.load();
    }, { root: root.current, rootMargin: '300px 0px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loaded, loading, error, hasMore, items.length, pager]);

  async function toggleSave(id: number) {
    if (!requireAuth() || busySaves.current.has(id)) return;
    busySaves.current.add(id);
    try {
      const result = await toggleWishlistMovie(id);
      setSavedIds(ids => result.saved ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
    } finally { busySaves.current.delete(id); }
  }

  return (
    <main className="flex h-full min-h-0 flex-col" style={{ backgroundColor: colors.bg, color: colors.text, paddingTop: 'var(--tg-chrome, 0px)' }}>
      <header className="flex shrink-0 items-center gap-3 border-b px-4 pb-3 md:px-6" style={{ borderColor: colors.borderSoft, paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <Link href="/home" aria-label={t('listing.back')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: colors.panelSoft }}>
          <ChevronLeftIcon size={24} color={colors.text} />
        </Link>
        <h1 className="text-lg font-bold md:text-2xl">{categoryTitle(category, language)}</h1>
      </header>
      <div ref={root} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(24px,var(--app-bottom-inset,env(safe-area-inset-bottom)))] md:px-6" onScroll={event => {
        const node = event.currentTarget;
        if (restored.current) pager.setScrollTop(node.scrollTop);
        if (loaded && hasMore && !error && node.scrollHeight - node.scrollTop - node.clientHeight < 300) void pager.load();
      }}>
        <MovieSectionGrid items={items} loading={loading || !loaded && !error} language={language} savedIds={savedIds} onToggleSave={id => { void toggleSave(id).catch(() => {}); }} />
        {loaded && !items.length && !error && <p className="py-12 text-center">{t('listing.empty')}</p>}
        {error && <div role="alert" className="flex flex-col items-center gap-3 py-6">
          <p>{t('listing.error')}</p>
          <button type="button" onClick={() => void pager.load()} className="rounded-xl px-5 py-3 font-semibold" style={{ backgroundColor: colors.panelSoft }}>{t('listing.retry')}</button>
        </div>}
        <div ref={sentinel} className="h-px" aria-hidden="true" />
        {loaded && hasMore && !loading && !error && <button type="button" onClick={() => void pager.load()} className="mx-auto mt-3 block rounded-xl px-5 py-3" style={{ backgroundColor: colors.panelSoft }}>{t('listing.more')}</button>}
        <span role="status" className="sr-only">{loading ? t('common.loading') : ''}</span>
      </div>
    </main>
  );
}
