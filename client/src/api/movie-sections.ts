import { apiFetch } from './client';
import type { HomeMovie } from './movies';

export const movieSections = ['actionMovies', 'horrorMovies', 'animationMovies', 'romanceMovies', 'dramaMovies', 'comedyMovies', 'familyMovies', 'sciFiMovies', 'otherMovies'] as const;
export type MovieSection = typeof movieSections[number];
export type HomeSection = { categoryName: MovieSection; movies: HomeMovie[]; hasMore: boolean };
export type MovieSectionPage = { items: HomeMovie[]; nextCursor: string | null; hasMore: boolean };
export function isMovieSection(value: string): value is MovieSection {
  return movieSections.some(section => section === value);
}
async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Request aborted', 'AbortError');
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  // Match the existing movie API deadline, while retaining navigation cancellation.
  const timer = setTimeout(() => controller.abort(new DOMException('Movie listing timed out', 'TimeoutError')), 15000);
  try {
    const result = await apiFetch<{ ok: boolean; data?: T; error?: string }>(path, { cache: 'no-store', signal: controller.signal });
    if (!result.ok || result.data == null) throw new Error(result.error || 'Movie listing unavailable');
    return result.data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
export function fetchHomeSections() {
  return read<HomeSection[]>('/api/movie-listing/home');
}
export function fetchMovieSection(category: MovieSection, cursor: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: '12' });
  if (cursor) query.set('cursor', cursor);
  return read<MovieSectionPage>(`/api/movie-listing/${category}?${query}`, signal);
}
