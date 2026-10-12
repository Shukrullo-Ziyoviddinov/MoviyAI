"use client";

import type { HomeMovie } from "@/api/movies";
import type { AppLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { categoryTitle } from "@/data/homeMovies";
import { HorizontalScroll } from "@/components/common/HorizontalScroll";
import { MovieCard } from "@/components/home/MovieCard";

export function MovieCategoryRow({
  categoryName,
  movies,
  language,
}: {
  categoryName: string;
  movies: HomeMovie[];
  language: AppLanguage;
}) {
  const { colors } = useTheme();
  if (movies.length === 0) return null;

  return (
    <section className="mb-[18px] md:mb-5">
      <h2
        className="mb-3 px-4 text-[18px] font-bold md:mb-3.5 md:text-[20px]"
        style={{ color: colors.text }}
      >
        {categoryTitle(categoryName, language)}
      </h2>
      <HorizontalScroll className="gap-3 px-4 md:gap-3.5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} language={language} />
        ))}
      </HorizontalScroll>
    </section>
  );
}
