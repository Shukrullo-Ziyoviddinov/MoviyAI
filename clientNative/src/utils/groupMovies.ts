import type { Movie } from '@/src/types/movie';

export type MovieCategoryGroup = {
  categoryName: string;
  movies: Movie[];
};

/** Hozircha faqat jangari — qolgan bo'limlar keyin */
const ACTIVE_CATEGORIES = ['actionMovies'] as const;

export function groupMoviesByCategory(movies: Movie[]): MovieCategoryGroup[] {
  const groups: MovieCategoryGroup[] = [];

  for (const categoryName of ACTIVE_CATEGORIES) {
    const list = movies.filter((m) => m.categoryName === categoryName);
    if (list.length > 0) {
      groups.push({ categoryName, movies: list });
    }
  }

  return groups;
}
