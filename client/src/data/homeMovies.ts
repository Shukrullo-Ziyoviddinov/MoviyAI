import type { HomeMovie } from "@/api/movies";
import type { AppLanguage } from "@/components/language/language-state";

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

const CATEGORY_TITLES: Record<(typeof ACTIVE_CATEGORIES)[number], Record<AppLanguage, string>> = {
  actionMovies: { uz: "Jangari kinolar", ru: "Боевики", en: "Action movies" },
  horrorMovies: { uz: "Qo'rqinchli kinolar", ru: "Ужасы", en: "Horror movies" },
  animationMovies: { uz: "Multfilimlar", ru: "Мультфильмы", en: "Cartoons" },
  romanceMovies: { uz: "Romantika va muhabbat", ru: "Романтика и любовь", en: "Romance and love" },
  dramaMovies: { uz: "Drama kino", ru: "Драмы", en: "Drama movies" },
  comedyMovies: { uz: "Komediya kino seriallar", ru: "Комедии и сериалы", en: "Comedy movies & series" },
  familyMovies: { uz: "Oilaviy kino seriallar", ru: "Семейные кино и сериалы", en: "Family movies & series" },
  sciFiMovies: { uz: "Fantastika kinolar", ru: "Фантастика", en: "Sci-Fi movies" },
};

export function groupMoviesByCategory(movies: HomeMovie[]): MovieCategoryGroup[] {
  const groups: MovieCategoryGroup[] = [];
  for (const categoryName of ACTIVE_CATEGORIES) {
    const list = movies.filter((movie) => movie.categoryName === categoryName);
    if (list.length > 0) groups.push({ categoryName, movies: list });
  }
  return groups;
}

export function categoryTitle(categoryName: string, language: AppLanguage) {
  const titles = CATEGORY_TITLES[categoryName as (typeof ACTIVE_CATEGORIES)[number]];
  if (!titles) return categoryName;
  return titles[language] ?? titles.uz;
}

export function movieTitle(movie: HomeMovie, language: AppLanguage) {
  const lang = language === "en" ? "uz" : language;
  return movie.title[lang] ?? movie.title.uz ?? "";
}
