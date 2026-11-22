"use client";

import { useEffect, useSyncExternalStore } from 'react';
import type { MovieSection } from '@/api/movie-sections';
import { getMovieSectionPager } from '@/components/recommendations/movie-section-pager';

export function useMovieSection(category: MovieSection) {
  const pager = getMovieSectionPager(category);
  const state = useSyncExternalStore(pager.subscribe, pager.getSnapshot, pager.getServerSnapshot);
  useEffect(() => {
    if (!pager.getSnapshot().loaded) void pager.load();
    return () => pager.cancel();
  }, [pager]);
  return { ...state, pager };
}
