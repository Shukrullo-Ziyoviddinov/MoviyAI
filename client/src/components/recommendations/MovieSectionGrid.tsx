"use client";

import type { HomeMovie } from '@/api/movies';
import { MovieCard, MovieCardSkeleton } from '@/components/home/MovieCard';
import type { AppLanguage } from '@/components/language/language-state';

export function MovieSectionGrid({ items, loading, language, savedIds, onToggleSave }: {
  items: HomeMovie[]; loading: boolean; language: AppLanguage; savedIds: number[]; onToggleSave: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-busy={loading}>
      {items.map(movie => <MovieCard key={movie.id} movie={movie} grid language={language} saved={savedIds.includes(movie.id)} onToggleSave={onToggleSave} />)}
      {loading && Array.from({ length: items.length ? 6 : 12 }, (_, index) => <MovieCardSkeleton key={`skeleton-${index}`} grid />)}
    </div>
  );
}
