import { api } from '@/src/api/client';
import type { Movie } from '@/src/types/movie';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchMovies(): Promise<Movie[]> {
  const { data } = await api.get<ApiResponse<Movie[]>>('/api/movies');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Movies failed to load');
  }
  return data.data;
}

export async function fetchMovieById(id: number): Promise<Movie> {
  const { data } = await api.get<ApiResponse<Movie>>(`/api/movies/${id}`);
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Movie failed to load');
  }
  return data.data;
}
