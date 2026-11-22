import { api } from '@/src/api/client';
import type { MovieCardData } from '@/src/types/movie';

export const movieSections = ['actionMovies', 'horrorMovies', 'animationMovies', 'romanceMovies', 'dramaMovies', 'comedyMovies', 'familyMovies', 'sciFiMovies', 'otherMovies'] as const;
export type MovieSection = typeof movieSections[number];
export type HomeSection = { categoryName: MovieSection; movies: MovieCardData[]; hasMore: boolean };
export type MovieSectionPage = { items: MovieCardData[]; nextCursor: string | null; hasMore: boolean };
export function isMovieSection(value: unknown): value is MovieSection {
  return typeof value === 'string' && movieSections.some(section => section === value);
}
export async function fetchHomeSections(): Promise<HomeSection[]> {
  const { data } = await api.get<{ ok: boolean; data?: HomeSection[]; error?: string }>('/api/movie-listing/home');
  if (!data.ok || !data.data) throw new Error(data.error || 'Movie sections unavailable');
  return data.data;
}
export async function fetchMovieSection(category: MovieSection, cursor: string | null, signal: AbortSignal): Promise<MovieSectionPage> {
  const { data } = await api.get<{ ok: boolean; data?: MovieSectionPage; error?: string }>(`/api/movie-listing/${category}`, {
    params: { limit: 12, ...(cursor ? { cursor } : {}) }, signal,
  });
  if (!data.ok || !data.data) throw new Error(data.error || 'Movie section unavailable');
  return data.data;
}
