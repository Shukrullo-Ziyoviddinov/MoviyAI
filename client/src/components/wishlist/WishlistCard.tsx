"use client";

import Link from "next/link";
import { moviePosterUrl, type WishlistMovie } from "@/api/wishlist";
import { BookmarkIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

const SAVE_ACTIVE = "#1E4FD6";

export function WishlistCard({ movie, onToggleSave }: { movie: WishlistMovie; onToggleSave: (movieId: number) => void }) {
  const { colors } = useTheme();
  const poster = moviePosterUrl(movie.homeImgPoster);
  const title = movie.title.uz || movie.title.ru;

  return (
    <div className="relative min-w-0">
      <Link href={`/movie/${movie.id}`} className="block">
        <div className="relative overflow-hidden rounded-[14px]" style={{ backgroundColor: colors.panelSoft }}>
          {poster ? (
            <img src={poster} alt="" className="aspect-[10/13] w-full object-cover" />
          ) : (
            <div className="aspect-[10/13] w-full" />
          )}
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1">
            <span className="text-[10px] font-bold text-[#F5C518]">IMDb</span>
            <span className="text-[12px] font-bold text-white">{Number(movie.ratingImdb || 0).toFixed(1)}</span>
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[15px] leading-5 font-semibold" style={{ color: colors.text }}>
          {title}
        </p>
      </Link>
      <button
        type="button"
        aria-label="Saqlash"
        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.55]"
        onClick={() => onToggleSave(movie.id)}
      >
        <BookmarkIcon size={20} color={SAVE_ACTIVE} filled />
      </button>
    </div>
  );
}
