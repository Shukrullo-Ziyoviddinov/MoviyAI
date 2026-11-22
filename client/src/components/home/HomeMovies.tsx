"use client";

import { useEffect, useRef, useState } from "react";
import { fetchHomeSections } from '@/api/movie-sections';
import { translate } from '@/i18n';
import { fetchTopSearchedMovies, fetchWeeklyTopSearchedMovies, type HomeMovie } from "@/api/movies";
import { fetchWishlistIds, toggleWishlistMovie } from "@/api/wishlist";
import { MovieCardSkeleton } from "@/components/home/MovieCard";
import { MovieCategoryRow } from "@/components/home/MovieCategoryRow";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { useAuth } from "@/components/auth/auth-state";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { groupMoviesByCategory } from "@/data/homeMovies";

export function HomeMovies({ movies: initialMovies, moviesError = false, topSearched = [], weeklySearched = [] }: { movies: HomeMovie[] | null; moviesError?: boolean; topSearched?: HomeMovie[]; weeklySearched?: HomeMovie[] }) {
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const [retried, setRetried] = useState<{ source: HomeMovie[] | null; movies: HomeMovie[] } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryBusy = useRef(false);
  const movies = retried?.source === initialMovies ? retried.movies : initialMovies;
  const loadError = moviesError && retried?.source !== initialMovies;
  const { token, requireAuth } = useAuth();
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";
  const [savedIds, setSavedIds] = useState<number[]>([]);

  async function retrySections() {
    if (retryBusy.current) return;
    retryBusy.current = true;
    setRetrying(true);
    try {
      const sections = await fetchHomeSections();
      setRetried({ source: initialMovies, movies: sections.flatMap(section => section.movies) });
    } catch { /* Keep the visible error and allow another explicit retry. */ }
    finally { retryBusy.current = false; setRetrying(false); }
  }

  const [liveWeekly, setLiveWeekly] = useState<HomeMovie[] | null>(null);
  const [liveTop, setLiveTop] = useState<HomeMovie[] | null>(null);
  useEffect(() => {
    let alive = true, pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        await Promise.allSettled([
          fetchTopSearchedMovies().then(rows => { if (alive) setLiveTop(rows); }),
          fetchWeeklyTopSearchedMovies().then(rows => { if (alive) setLiveWeekly(rows); }),
        ]);
      }
      finally { pending = false; }
    };
    const timer = window.setInterval(() => { void refresh(); }, 60000);
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    if (!movies) return;
    let alive = true;
    fetchWishlistIds()
      .then((ids) => {
        if (alive) setSavedIds(ids);
      })
      .catch(() => {
        if (alive) setSavedIds([]);
      });
    return () => {
      alive = false;
    };
  }, [movies, token]);

  async function onToggleSave(movieId: number) {
    if (!requireAuth()) return;
    let previous: number[] = [];
    setSavedIds((ids) => {
      previous = ids;
      return ids.includes(movieId) ? ids.filter((id) => id !== movieId) : [...ids, movieId];
    });
    try {
      const result = await toggleWishlistMovie(movieId);
      setSavedIds((ids) =>
        result.saved ? (ids.includes(movieId) ? ids : [...ids, movieId]) : ids.filter((id) => id !== movieId),
      );
    } catch {
      setSavedIds(previous);
    }
  }

  if (movies === null) {
    return (
      <div className="mt-4">
        {Array.from({ length: 3 }, (_, row) => (
          <section key={row} className="mb-[18px]">
            <div className="mb-3 ml-4 h-[22px] w-[calc(39cqw*1.35)] animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
            <div className="flex gap-3 px-4">
              {Array.from({ length: 3 }, (_, card) => (
                <MovieCardSkeleton key={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const categories = groupMoviesByCategory(movies);
  const displayedTop = liveTop ?? topSearched;
  const displayedWeekly = liveWeekly ?? weeklySearched;
  const orderedCategories = [...categories];
  if (displayedWeekly.length) {
    const dramaIndex = orderedCategories.findIndex(group => group.categoryName === 'dramaMovies');
    orderedCategories.splice(dramaIndex >= 0 ? dramaIndex + 1 : orderedCategories.length, 0, { categoryName: 'weeklyTopSearchedMovies', movies: displayedWeekly });
  }

  if (categories.length === 0 && !displayedTop.length && !displayedWeekly.length && !loadError) {
    return (
      <div className="mt-4 flex min-h-[320px]">
        <HomeEmptyState />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {displayedTop.length > 0 && <MovieCategoryRow categoryName="topSearchedMovies" ranked movies={displayedTop} language={language} savedIds={savedIds} onToggleSave={(id) => void onToggleSave(id)} />}
      {orderedCategories.map((group) => (
        <MovieCategoryRow
          key={group.categoryName}
          categoryName={group.categoryName}
          ranked={group.categoryName === 'weeklyTopSearchedMovies'}
          movies={group.movies}
          language={language}
          savedIds={savedIds}
          onToggleSave={(id) => void onToggleSave(id)}
        />
      ))}
      {loadError && <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8" style={{ color: colors.text }}>
        <p>{translate(language, 'listing.error')}</p>
        <button type="button" disabled={retrying} onClick={() => void retrySections()} className="rounded-xl px-5 py-3 disabled:opacity-60" style={{ backgroundColor: colors.panelSoft }}>
          {translate(language, retrying ? 'common.loading' : 'listing.retry')}
        </button>
      </div>}
    </div>
  );
}
