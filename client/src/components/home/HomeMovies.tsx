"use client";

import type { HomeMovie } from "@/api/movies";
import { MovieCardSkeleton } from "@/components/home/MovieCard";
import { MovieCategoryRow } from "@/components/home/MovieCategoryRow";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { groupMoviesByCategory } from "@/data/homeMovies";

export function HomeMovies({ movies }: { movies: HomeMovie[] | null }) {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  if (movies === null) {
    return (
      <div className="mt-4">
        {Array.from({ length: 3 }, (_, row) => (
          <section key={row} className="mb-[18px]">
            <div className="mb-3 ml-4 h-[22px] w-[calc(39cqw*1.35)] animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
            <div className="flex gap-3 px-4">
              {Array.from({ length: 3 }, (_, card) => (
                <MovieCardSkeleton key={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const categories = groupMoviesByCategory(movies);
  if (categories.length === 0) {
    return (
      <div className="mt-4 flex min-h-[320px]">
        <HomeEmptyState />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {categories.map((group) => (
        <MovieCategoryRow
          key={group.categoryName}
          categoryName={group.categoryName}
          movies={group.movies}
          language={language}
        />
      ))}
    </div>
  );
}
