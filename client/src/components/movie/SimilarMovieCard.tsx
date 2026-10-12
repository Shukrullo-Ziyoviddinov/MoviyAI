"use client";

import { useState } from "react";
import Link from "next/link";
import { moviePosterUrl, type Movie } from "@/api/movies";
import { BookmarkIcon } from "@/components/icons";
import type { AppLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";

export function SimilarMovieCard({ movie, language }: { movie: Movie; language: AppLanguage }) {
  const { colors, isDark } = useTheme();
  const lang = language === "en" ? "uz" : language;
  const title = movie.title[lang] ?? movie.title.uz;
  const poster = moviePosterUrl(movie.homeImgPoster);
  const [ready, setReady] = useState(false);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  return (
    <Link href={`/movie/${movie.id}`} className="mr-3 w-[36cqw] shrink-0 md:w-[168px]">
      <div
        className="relative aspect-[100/135] overflow-hidden rounded-[14px] border"
        style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
      >
        {poster && !ready ? <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover"
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        ) : null}
        {poster && ready ? (
          <>
            <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.55]">
              <BookmarkIcon size={20} color="#FFFFFF" />
            </span>
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/[0.72] px-2 py-1">
              <span className="text-[10px] font-bold text-[#F5C518]">IMDb</span>
              <span className="text-[12px] font-bold text-white">{Number(movie.ratingImdb || 0).toFixed(1)}</span>
            </span>
          </>
        ) : null}
      </div>
      <p className="mt-2 h-[22px] truncate text-[14px] leading-[18px] font-semibold" style={{ color: colors.text }}>
        {title}
      </p>
    </Link>
  );
}
