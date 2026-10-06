import {
  fetchWishlistIds,
  fetchWishlistMovies,
  toggleWishlistMovie,
} from '@/src/api/wishlist';
import type { Movie } from '@/src/types/movie';
import { create } from 'zustand';

type WishlistState = {
  movieIds: number[];
  movies: Movie[];
  loaded: boolean;
  loading: boolean;
  loadIds: (force?: boolean) => Promise<void>;
  loadMovies: (force?: boolean) => Promise<void>;
  toggle: (movieId: number) => Promise<boolean>;
  isSaved: (movieId: number) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  movieIds: [],
  movies: [],
  loaded: false,
  loading: false,

  isSaved: (movieId) => get().movieIds.includes(movieId),

  clear: () => set({ movieIds: [], movies: [], loaded: false, loading: false }),

  loadIds: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;

    set({ loading: true });
    try {
      const ids = await fetchWishlistIds();
      set({ movieIds: ids, loaded: true });
    } catch {
      set({ movieIds: [], loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  loadMovies: async (force = false) => {
    if (get().loading && !force) return;
    set({ loading: true });
    try {
      const [movies, ids] = await Promise.all([
        fetchWishlistMovies(),
        fetchWishlistIds(),
      ]);
      set({ movies, movieIds: ids, loaded: true });
    } catch {
      set({ movies: [], movieIds: [], loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (movieId) => {
    const result = await toggleWishlistMovie(movieId);
    set((state) => {
      const exists = state.movieIds.includes(movieId);
      let movieIds = state.movieIds;
      let movies = state.movies;

      if (result.saved && !exists) {
        movieIds = [movieId, ...state.movieIds];
      } else if (!result.saved && exists) {
        movieIds = state.movieIds.filter((id) => id !== movieId);
        movies = state.movies.filter((m) => m.id !== movieId);
      }

      return { movieIds, movies };
    });
    return result.saved;
  },
}));
