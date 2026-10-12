"use client";

import { moviePosterUrl, type WishlistMovie } from "@/api/wishlist";
import { useTheme } from "@/components/theme/theme-state";

export function WishlistCard({ movie }: { movie: WishlistMovie }) {
  const { colors } = useTheme();
  const poster = moviePosterUrl(movie.homeImgPoster);
  const title = movie.title.uz || movie.title.ru;

  return (
    <article className="min-w-0">
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
    </article>
  );
}
