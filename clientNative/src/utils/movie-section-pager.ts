import { fetchMovieSection, type MovieSection, type MovieSectionPage } from '@/src/api/movie-sections';
import type { MovieCardData } from '@/src/types/movie';

type PageState = { items: MovieCardData[]; cursor: string | null; hasMore: boolean; loaded: boolean; loading: boolean; error: boolean };
const initial: PageState = { items: [], cursor: null, hasMore: true, loaded: false, loading: false, error: false };
type ReadPage = (category: MovieSection, cursor: string | null, signal: AbortSignal) => Promise<MovieSectionPage>;

export function createMovieSectionPager(category: MovieSection, read: ReadPage = fetchMovieSection) {
  let state = initial;
  let active: AbortController | null = null;
  let scrollTop = 0;
  const listeners = new Set<() => void>();
  const update = (next: Partial<PageState>) => {
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getScrollTop: () => scrollTop,
    setScrollTop: (value: number) => { scrollTop = value; },
    cancel() {
      const request = active;
      active = null;
      request?.abort();
      if (state.loading) update({ loading: false });
    },
    async load() {
      if (active || !state.hasMore) return;
      const request = new AbortController();
      active = request;
      const cursor = state.cursor;
      update({ loading: true, error: false });
      try {
        const page = await read(category, cursor, request.signal);
        if (active !== request) return;
        if (!Array.isArray(page.items) || typeof page.hasMore !== 'boolean' ||
          page.hasMore && (!page.items.length || !page.nextCursor || page.nextCursor === cursor)) throw new Error('Invalid listing page');
        const seen = new Set(state.items.map(item => item.id));
        const added = page.items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
        update({ items: [...state.items, ...added], cursor: page.nextCursor, hasMore: page.hasMore, loaded: true, error: false });
      } catch {
        if (active === request && !request.signal.aborted) update({ error: true });
      } finally {
        if (active === request) { active = null; update({ loading: false }); }
      }
    },
  };
}
const pagers = new Map<MovieSection, ReturnType<typeof createMovieSectionPager>>();
export function getMovieSectionPager(category: MovieSection) {
  let pager = pagers.get(category);
  if (!pager) { pager = createMovieSectionPager(category); pagers.set(category, pager); }
  return pager;
}
