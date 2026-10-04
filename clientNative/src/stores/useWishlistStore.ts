import {
  fetchWishlistIds,
  toggleWishlistMovie,
} from '@/src/api/wishlist';
import { create } from 'zustand';

type WishlistState = {
  movieIds: number[];
  loaded: boolean;
  loading: boolean;
  loadIds: () => Promise<void>;
  toggle: (movieId: number) => Promise<boolean>;
  isSaved: (movieId: number) => boolean;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  movieIds: [],
  loaded: false,
  loading: false,

  isSaved: (movieId) => get().movieIds.includes(movieId),

  loadIds: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const ids = await fetchWishlistIds();
      set({ movieIds: ids, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (movieId) => {
    const result = await toggleWishlistMovie(movieId);
    set((state) => {
      const exists = state.movieIds.includes(movieId);
      if (result.saved && !exists) {
        return { movieIds: [movieId, ...state.movieIds] };
      }
      if (!result.saved && exists) {
        return { movieIds: state.movieIds.filter((id) => id !== movieId) };
      }
      return state;
    });
    return result.saved;
  },
}));
