import { api } from '@/src/api/client';
import type { Movie } from '@/src/types/movie';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchWishlistMovies(): Promise<Movie[]> {
  const { data } = await api.get<ApiResponse<Movie[]>>('/api/wishlist');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Wishlist failed to load');
  }
  return data.data;
}

export async function fetchWishlistIds(): Promise<number[]> {
  const { data } = await api.get<ApiResponse<number[]>>('/api/wishlist/ids');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Wishlist ids failed to load');
  }
  return data.data;
}

export async function toggleWishlistMovie(movieId: number) {
  const { data } = await api.post<
    ApiResponse<{ saved: boolean; movieId: number }>
  >('/api/wishlist/toggle', { movieId });
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Wishlist toggle failed');
  }
  return data.data;
}
