"use client";

import { useState } from "react";
import Link from "next/link";
import { moviePosterUrl } from "@/api/wishlist";
import type { HomeMovie } from "@/api/movies";
import { BookmarkIcon } from "@/components/icons";
import type { AppLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { movieTitle } from "@/data/homeMovies";

export const movieCardWidth = "w-[39cqw] md:w-[clamp(168px,18cqw,200px)]";
export const moviePosterHeight = "h-[calc(39cqw*1.3)] md:h-[calc(clamp(168px,18cqw,200px)*1.3)]";

export function MovieCardSkeleton() {
  const { isDark } = useTheme();
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  return (
    <div className={`${movieCardWidth} shrink-0`}>
      <div className={`${moviePosterHeight} animate-pulse rounded-[14px] md:rounded-[16px]`} style={{ backgroundColor: bone }} />
      <div className="mt-2 h-[22px] animate-pulse rounded-lg md:h-6" style={{ backgroundColor: bone }} />
    </div>
  );
}

const SAVE_ACTIVE = "#1E4FD6";

export function MovieCard({
  movie,
  language,
  saved,
  onToggleSave,
}: {
  movie: HomeMovie;
  language: AppLanguage;
  saved: boolean;
  onToggleSave: (movieId: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const poster = moviePosterUrl(movie.homeImgPoster);
  const title = movieTitle(movie, language);
  const [ready, setReady] = useState(false);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";
  const showChrome = !poster || ready;

  return (
    <div className={`${movieCardWidth} relative mb-[14px] shrink-0 md:mb-4`}>
      <Link href={`/movie/${movie.id}`} className="block">
        <div
          className={`relative overflow-hidden rounded-[14px] md:rounded-[16px] ${moviePosterHeight}`}
          style={{ backgroundColor: colors.panelSoft }}
        >
          {poster && !ready ? (
            <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: bone }} />
          ) : null}
          {poster ? (
            <img
              src={poster}
              alt=""
              draggable={false}
              className="h-full w-full object-fill"
              onLoad={() => setReady(true)}
              onError={() => setReady(true)}
            />
          ) : null}
          {showChrome ? (
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/[0.72] px-2 py-1">
              <span className="text-[10px] font-bold text-[#F5C518] md:text-[11px]">IMDb</span>
              <span className="text-[12px] font-bold text-white md:text-[13px]">
                {Number(movie.ratingImdb || 0).toFixed(1)}
              </span>
            </span>
          ) : null}
        </div>
        <div className="mt-2 h-[22px] md:h-6">
          {title.trim() ? (
            <p
              className="truncate text-[15px] leading-[18px] font-semibold md:text-[16px] md:leading-5"
              style={{ color: colors.text }}
            >
              {title}
            </p>
          ) : (
            <div className="h-[22px] animate-pulse rounded-lg md:h-6" style={{ backgroundColor: bone }} />
          )}
        </div>
      </Link>
      {showChrome ? (
        <button
          type="button"
          aria-label="Saqlash"
          className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.55] md:h-8 md:w-8"
          onClick={() => onToggleSave(movie.id)}
        >
          <BookmarkIcon size={20} color={saved ? SAVE_ACTIVE : "#FFFFFF"} filled={saved} />
        </button>
      ) : null}
    </div>
  );
}
