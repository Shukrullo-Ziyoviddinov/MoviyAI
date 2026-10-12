"use client";

import Link from "next/link";
import type { Movie, MovieDescription } from "@/api/movies";
import { moviePosterUrl } from "@/api/movies";
import type { MovieCopy } from "@/data/movieCopy";
import { extractYoutubeVideoId } from "@/utils/youtube";
import { useTheme } from "@/components/theme/theme-state";
import type { AppLanguage } from "@/components/language/language-state";

export function TrailerModal({
  open,
  onClose,
  movie,
  trailers,
  description,
  copy,
  language,
}: {
  open: boolean;
  onClose: () => void;
  movie: Movie | null;
  trailers: Movie[];
  description: MovieDescription | null;
  copy: MovieCopy;
  language: AppLanguage;
}) {
  const { colors } = useTheme();
  if (!open || !movie) return null;
  const videoId = extractYoutubeVideoId(movie.trailers);
  const lang = language === "en" ? "uz" : language;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-3xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
        style={{ backgroundColor: colors.bg }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ backgroundColor: colors.borderSoft }} />
        {videoId ? (
          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe
              title={copy.trailer}
              src={`https://www.youtube.com/embed/${videoId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="py-6 text-center text-[14px]" style={{ color: colors.textMuted }}>
            {copy.trailerUnavailable}
          </p>
        )}
        <h2 className="mt-3 text-[17px] font-bold" style={{ color: colors.text }}>
          {movie.title[lang] ?? movie.title.uz}
        </h2>
        {description?.text ? (
          <p className="mt-2 line-clamp-3 text-[14px] leading-[21px]" style={{ color: colors.text }}>
            {description.text}
          </p>
        ) : null}
        {movie.watchUrl ? (
          <a
            href={movie.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex h-11 items-center justify-center rounded-xl text-[14px] font-bold text-white"
            style={{ backgroundColor: colors.accentBright }}
          >
            {copy.watch}
          </a>
        ) : null}
        {trailers.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.similarTrailers}
            </h3>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
              {trailers.map((item) => (
                <Link key={item.id} href={`/movie/${item.id}`} onClick={onClose} className="w-[140px] shrink-0">
                  <img src={moviePosterUrl(item.homeImgPoster)} alt="" className="aspect-[100/135] w-full rounded-[14px] object-cover" />
                  <p className="mt-2 truncate text-[13px] font-semibold" style={{ color: colors.text }}>
                    {item.title[lang] ?? item.title.uz}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
