import { fetchMovies, fetchTopSearchedMovies } from '@/src/api/movies';
import type { Movie } from '@/src/types/movie';
import { create } from 'zustand';

type MoviesState = {
  movies: Movie[];
  topSearched: Movie[];
  topLoading: boolean;
  loadTopSearched: () => Promise<void>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadMovies: (force?: boolean) => Promise<void>;
};

export const useMoviesStore = create<MoviesState>((set, get) => ({
  movies: [],
  topSearched: [],
  topLoading: false,
  loadTopSearched: async () => {
    if (get().topLoading) return;
    set({ topLoading: true });
    try { set({ topSearched: await fetchTopSearchedMovies() }); } catch { /* Retain the last ranking. */ }
    finally { set({ topLoading: false }); }
  },
  loaded: false,
  loading: false,
  error: null,

  loadMovies: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;

    set({ loading: true, error: null });
    try {
      const movies = await fetchMovies();
      set({ movies, loaded: true, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Load failed',
        movies: get().movies,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
