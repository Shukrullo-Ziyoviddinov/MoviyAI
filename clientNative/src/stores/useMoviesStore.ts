import { fetchMovies } from '@/src/api/movies';
import type { Movie } from '@/src/types/movie';
import { create } from 'zustand';

type MoviesState = {
  movies: Movie[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadMovies: (force?: boolean) => Promise<void>;
};

export const useMoviesStore = create<MoviesState>((set, get) => ({
  movies: [],
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
