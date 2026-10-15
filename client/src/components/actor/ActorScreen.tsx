"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Actor } from "@/api/actors";
import { actorImageUrl, moviePosterUrl, type HomeMovie } from "@/api/movies";
import { fetchWishlistIds, toggleWishlistMovie } from "@/api/wishlist";
import { useAuth } from "@/components/auth/auth-state";
import { ActorInfoModal } from "@/components/actor/ActorInfoModal";
import { useImageReady } from "@/components/common/useImageReady";
import { BookmarkIcon, ChevronLeftIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";
import { actorCopy } from "@/data/actorCopy";

const SAVE_ACTIVE = "#1E4FD6";

function ActorMovieCardSkeleton({ bone }: { bone: string }) {
  return (
    <div className="min-w-0">
      <div className="aspect-[10/13] animate-pulse rounded-[14px]" style={{ backgroundColor: bone }} />
      <div className="mt-2 h-[18px] animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
    </div>
  );
}

function ActorMovieCard({
  movie,
  title,
  saved,
  onToggleSave,
}: {
  movie: HomeMovie;
  title: string;
  saved: boolean;
  onToggleSave: (id: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const poster = moviePosterUrl(movie.homeImgPoster);
  const image = useImageReady(poster);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";
  const showChrome = image.ready;

  return (
    <div className="min-w-0">
      <div className="relative">
        <Link href={`/movie/${movie.id}`} className="block">
          <div className="relative aspect-[10/13] overflow-hidden rounded-[14px]" style={{ backgroundColor: colors.panelSoft }}>
            {poster && !image.ready ? <div className="absolute inset-0 z-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
            {poster ? (
              <img
                ref={image.ref}
                src={poster}
                alt=""
                className="relative z-[1] h-full w-full object-fill"
                onLoad={image.onLoad}
                onError={image.onError}
              />
            ) : null}
            {showChrome ? (
              <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/[0.72] px-2 py-1">
                <span className="text-[10px] font-bold text-[#F5C518]">IMDb</span>
                <span className="text-[12px] font-bold text-white">{Number(movie.ratingImdb || 0).toFixed(1)}</span>
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-[15px] leading-[18px] font-semibold" style={{ color: colors.text }}>
            {title}
          </p>
        </Link>
        {showChrome ? (
          <button
            type="button"
            aria-label="Saqlash"
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.55]"
            onClick={() => onToggleSave(movie.id)}
          >
            <BookmarkIcon size={20} color={saved ? SAVE_ACTIVE : "#FFFFFF"} filled={saved} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ActorScreen({
  actor = null,
  loading = false,
  error = null,
}: {
  actor?: Actor | null;
  loading?: boolean;
  error?: string | null;
}) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { token, requireAuth } = useAuth();
  const copy = actorCopy(language);
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  useEffect(() => {
    setInfoOpen(false);
  }, [actor?.id, actor?.actorImg]);

  useEffect(() => {
    if (!actor?.movies?.length) return;
    fetchWishlistIds()
      .then(setSavedIds)
      .catch(() => setSavedIds([]));
  }, [actor?.id, actor?.movies?.length, token]);

  async function onToggleSave(movieId: number) {
    if (!requireAuth()) return;
    const prev = savedIds;
    const nextSaved = !prev.includes(movieId);
    setSavedIds(nextSaved ? [...prev, movieId] : prev.filter((id) => id !== movieId));
    try {
      const result = await toggleWishlistMovie(movieId);
      setSavedIds((ids) => (result.saved ? (ids.includes(movieId) ? ids : [...ids, movieId]) : ids.filter((id) => id !== movieId)));
    } catch {
      setSavedIds(prev);
    }
  }

  const lang = language === "en" ? "uz" : language;
  const aboutText = actor?.actorAbout ? (actor.actorAbout[lang] ?? actor.actorAbout.uz ?? "") : "";
  const photo = actor ? actorImageUrl(actor.actorImg) : "";
  const photoImage = useImageReady(photo);
  const movies = actor?.movies ?? [];

  return (
    <main className="@container relative h-full overflow-hidden" style={{ backgroundColor: colors.bg }}>
      <div
        className="absolute inset-x-0 z-20 px-4"
        style={{ top: "var(--tg-chrome, 0px)", paddingTop: "calc(var(--tg-safe-pad, max(8px, env(safe-area-inset-top))) + var(--tg-home-gap, 0px))" }}
      >
        <button
          type="button"
          aria-label="Orqaga"
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
          onClick={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </button>
      </div>

      {loading ? (
        <div
          className="no-scrollbar h-full overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
          style={{ paddingTop: "calc(var(--tg-chrome, 0px) + max(64px, calc(env(safe-area-inset-top) + 56px)))" }}
        >
          <div className="flex items-start gap-3.5">
            <div className="h-[148px] w-[110px] shrink-0 animate-pulse rounded-[14px]" style={{ backgroundColor: bone }} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="h-[26px] animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
              <div className="mt-2 h-5 animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
              <div className="mt-2 h-5 w-2/3 animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
            </div>
          </div>
          <section className="mt-[22px]">
            <div className="h-[18px] w-24 animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-5 md:gap-x-2.5 md:gap-y-3">
              {Array.from({ length: 10 }, (_, index) => (
                <ActorMovieCardSkeleton key={index} bone={bone} />
              ))}
            </div>
          </section>
        </div>
      ) : error || !actor ? (
        <div className="flex h-full items-center justify-center px-6">
          <p className="text-center text-[14px]" style={{ color: colors.textMuted }}>
            {error || copy.notFound}
          </p>
        </div>
      ) : (
        <div
          className="no-scrollbar h-full overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
          style={{ paddingTop: "calc(var(--tg-chrome, 0px) + max(64px, calc(env(safe-area-inset-top) + 56px)))" }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="relative h-[148px] w-[110px] shrink-0 overflow-hidden rounded-[14px] border"
              style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
            >
              {photo && !photoImage.ready ? <div className="absolute inset-0 z-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
              {photo ? (
                <img
                  ref={photoImage.ref}
                  src={photo}
                  alt=""
                  className="relative z-[1] h-full w-full object-cover"
                  onLoad={photoImage.onLoad}
                  onError={photoImage.onError}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              {actor.actorName.trim() ? (
                <h1 className="text-[20px] leading-[26px] font-bold" style={{ color: colors.text }}>
                  {actor.actorName}
                </h1>
              ) : (
                <div className="h-[26px] animate-pulse rounded-lg" style={{ backgroundColor: bone }} />
              )}
              {aboutText ? (
                <p className="mt-2 line-clamp-2 text-[14px] leading-5" style={{ color: colors.text }}>
                  {aboutText}
                </p>
              ) : null}
              {aboutText ? (
                <button type="button" className="mt-2 text-[14px] font-bold" style={{ color: colors.accentBright }} onClick={() => setInfoOpen(true)}>
                  {copy.readMore}
                </button>
              ) : null}
            </div>
          </div>

          {movies.length > 0 ? (
            <section className="mt-[22px]">
              <h2 className="text-[18px] font-bold" style={{ color: colors.text }}>
                {copy.moviesTitle}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-5 md:gap-x-2.5 md:gap-y-3">
                {movies.map((movie) => (
                  <ActorMovieCard
                    key={movie.id}
                    movie={movie}
                    title={movie.title?.[lang] ?? movie.title?.uz ?? ""}
                    saved={savedIds.includes(movie.id)}
                    onToggleSave={(id) => void onToggleSave(id)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <ActorInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        name={actor?.actorName ?? ""}
        aboutText={aboutText}
        aboutTitle={copy.aboutTitle}
      />
    </main>
  );
}
