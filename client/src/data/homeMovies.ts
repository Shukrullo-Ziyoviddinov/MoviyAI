import type { HomeMovie } from "@/api/movies";
import type { AppLanguage } from "@/components/language/language-state";
import { translate } from "@/i18n";

export type MovieCategoryGroup = {
  categoryName: string;
  movies: HomeMovie[];
};

const ACTIVE_CATEGORIES = [
  "actionMovies",
  "horrorMovies",
  "animationMovies",
  "romanceMovies",
  "dramaMovies",
  "comedyMovies",
  "familyMovies",
  "sciFiMovies",
] as const;

export function categoryTitle(categoryName: string, language: AppLanguage) {
  const key = `home.categories.${categoryName}`;
  const title = translate(language, key);
  return title === key ? categoryName : title;
}

export function groupMoviesByCategory(movies: HomeMovie[]): MovieCategoryGroup[] {
  const groups: MovieCategoryGroup[] = [];
  for (const categoryName of ACTIVE_CATEGORIES) {
    const list = movies.filter((movie) => movie.categoryName === categoryName);
    if (list.length > 0) groups.push({ categoryName, movies: list });
  }
  return groups;
}

export function movieTitle(movie: HomeMovie, language: AppLanguage) {
  const lang = language === "en" ? "uz" : language;
  return movie.title[lang] ?? movie.title.uz ?? "";
}
