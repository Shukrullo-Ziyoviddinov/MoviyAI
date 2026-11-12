import type { Movie } from '@/src/types/movie';

export type MovieCategoryGroup = {
  categoryName: string;
  movies: Movie[];
};

/** Hozircha faqat shu bo'limlar */
const ACTIVE_CATEGORIES = [
  'actionMovies',
  'horrorMovies',
  'animationMovies',
  'romanceMovies',
  'dramaMovies',
  'comedyMovies',
  'familyMovies',
  'sciFiMovies',
] as const;

export function groupMoviesByCategory(movies: Movie[]): MovieCategoryGroup[] {
  const groups: MovieCategoryGroup[] = [];

  for (const categoryName of ACTIVE_CATEGORIES) {
    const list = movies.filter((m) => m.categoryName === categoryName);
    if (list.length > 0) {
      groups.push({ categoryName, movies: list });
    }
  }

  const others=movies.filter(movie=>!ACTIVE_CATEGORIES.some(category=>category===movie.categoryName));
  if(others.length)groups.push({categoryName:'otherMovies',movies:others});
  return groups;
}
