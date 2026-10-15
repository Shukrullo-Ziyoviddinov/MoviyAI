"use client";

import { useState } from "react";
import Link from "next/link";
import { moviePosterUrl, type WishlistMovie } from "@/api/wishlist";
import { BookmarkIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

const SAVE_ACTIVE = "#1E4FD6";

export function WishlistCardSkeleton() {
  const { isDark } = useTheme();
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  return (
    <div className="min-w-0">
      <div className="aspect-[10/13] animate-pulse rounded-[14px]" style={{ backgroundColor: bone }} />
      <div className="mt-2 h-5 animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
    </div>
  );
}

export function WishlistCard({ movie, onToggleSave }: { movie: WishlistMovie; onToggleSave: (movieId: number) => void }) {
  const { colors, isDark } = useTheme();
  const poster = moviePosterUrl(movie.homeImgPoster);
  const title = movie.title.uz || movie.title.ru;
  const [ready, setReady] = useState(false);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";
  const showChrome = !poster || ready;

  return (
    <div className="relative min-w-0">
      <Link href={`/movie/${movie.id}`} className="block">
        <div className="relative overflow-hidden rounded-[14px]" style={{ backgroundColor: colors.panelSoft }}>
          {poster && !ready ? <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
          {poster ? (
            <img
              ref={(node) => {
                if (node?.complete) setReady(true);
              }}
              src={poster}
              alt=""
              className="aspect-[10/13] w-full object-cover"
              onLoad={() => setReady(true)}
              onError={() => setReady(true)}
            />
          ) : (
            <div className="aspect-[10/13] w-full" />
          )}
          {showChrome ? (
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1">
              <span className="text-[10px] font-bold text-[#F5C518]">IMDb</span>
              <span className="text-[12px] font-bold text-white">{Number(movie.ratingImdb || 0).toFixed(1)}</span>
            </span>
          ) : null}
        </div>
        {title.trim() ? (
          <p className="mt-2 line-clamp-2 text-[15px] leading-5 font-semibold" style={{ color: colors.text }}>
            {title}
          </p>
        ) : (
          <div className="mt-2 h-5 animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
        )}
      </Link>
      {showChrome ? (
        <button
          type="button"
          aria-label="Saqlash"
          className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.55]"
          onClick={() => onToggleSave(movie.id)}
        >
          <BookmarkIcon size={20} color={SAVE_ACTIVE} filled />
        </button>
      ) : null}
    </div>
  );
}
