import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import type { MovieSection } from '@/src/api/movie-sections';
import { getMovieSectionPager } from '@/src/utils/movie-section-pager';

export function useMovieSection(category: MovieSection) {
  const pager = getMovieSectionPager(category);
  const focused = useRef(false);
  const resume = useRef(false);
  const state = useSyncExternalStore(pager.subscribe, pager.getSnapshot, pager.getServerSnapshot);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!pager.getSnapshot().loaded || resume.current) void pager.load();
    resume.current = false;
    return () => { focused.current = false; resume.current = pager.getSnapshot().loading; pager.cancel(); };
  }, [pager]));
  const loadNext = useCallback(() => {
    if (focused.current && !pager.getSnapshot().error) void pager.load();
  }, [pager]);
  const retry = useCallback(() => { if (focused.current) void pager.load(); }, [pager]);
  return { ...state, pager, loadNext, retry };
}
