"use client";

import type { HomeMovie } from "@/api/movies";
import type { AppLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { categoryTitle } from "@/data/homeMovies";
import { HorizontalScroll } from "@/components/common/HorizontalScroll";
import { MovieCard } from "@/components/home/MovieCard";
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { isMovieSection } from '@/api/movie-sections';

export function MovieCategoryRow({
  categoryName,
  ranked = false,
  movies,
  language,
  savedIds,
  onToggleSave,
}: {
  categoryName: string;
  ranked?: boolean;
  movies: HomeMovie[];
  language: AppLanguage;
  savedIds: number[];
  onToggleSave: (movieId: number) => void;
}) {
  const { colors } = useTheme();
  if (movies.length === 0) return null;

  return (
    <section className="mb-[18px] md:mb-5">
      <h2
        className="mb-3 px-4 text-[18px] font-bold md:mb-3.5 md:text-[20px]"
        style={{ color: colors.text }}
      >
        {!ranked && isMovieSection(categoryName) ? (
          <Link href={`/recommendations/${categoryName}`} prefetch={false} className="flex w-fit items-center gap-2">
            {categoryTitle(categoryName, language)}
            <ChevronRightIcon size={22} color={colors.text} />
          </Link>
        ) : categoryTitle(categoryName, language)}
      </h2>
      <HorizontalScroll className="gap-3 px-4 md:gap-3.5">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            rank={ranked ? index + 1 : undefined}
            language={language}
            saved={savedIds.includes(movie.id)}
            onToggleSave={onToggleSave}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
