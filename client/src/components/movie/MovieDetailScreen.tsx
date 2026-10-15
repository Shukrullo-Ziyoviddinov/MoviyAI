"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Oswald } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  fetchCommentReplies,
  moviePosterUrl,
  toggleMovieReaction,
  type Movie,
  type MovieComment,
  type MovieDescription,
} from "@/api/movies";
import { fetchWishlistIds, toggleWishlistMovie } from "@/api/wishlist";
import { useAuth } from "@/components/auth/auth-state";
import { ActorChip } from "@/components/actor/ActorChip";
import { HorizontalScroll } from "@/components/common/HorizontalScroll";
import { useImageReady } from "@/components/common/useImageReady";
import { UserAvatar } from "@/components/common/UserAvatar";
import {
  AgeRatingIcon,
  BookmarkIcon,
  CalendarIcon,
  ChatBubbleIcon,
  ChevronLeftIcon,
  ClockIcon,
  DislikeIcon,
  GlobeIcon,
  LikeIcon,
  PlayIcon,
  SendIcon,
  ShareIcon,
  VideoIcon,
} from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { CommentModal } from "@/components/movie/CommentModal";
import { MovieDescriptionModal } from "@/components/movie/MovieDescriptionModal";
import { SimilarMovieCard } from "@/components/movie/SimilarMovieCard";
import { TrailerModal } from "@/components/movie/TrailerModal";
import { useTheme } from "@/components/theme/theme-state";
import { movieCopy } from "@/data/movieCopy";

const oswald = Oswald({ subsets: ["latin", "cyrillic"], weight: "700" });
const SAVE_ACTIVE = "#1E4FD6";
const LIKE_ACTIVE = "#22C55E";
const DISLIKE_ACTIVE = "#EF4444";
const EMPTY_COMMENTS: MovieComment[] = [];
const EMPTY_MOVIES: Movie[] = [];

function authorName(comment: { authorName?: string; userId: string }) {
  const name = String(comment.authorName ?? "").trim();
  if (name) return name;
  const tail = comment.userId.replace(/^user_/, "").slice(-4);
  return tail ? `User ${tail}` : "User";
}

function commentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function MovieDetailScreen({
  movieId,
  loading = false,
  movie = null,
  comments = EMPTY_COMMENTS,
  similar = EMPTY_MOVIES,
  trailers = EMPTY_MOVIES,
  error = null,
}: {
  movieId: number;
  loading?: boolean;
  movie?: Movie | null;
  comments?: MovieComment[];
  similar?: Movie[];
  trailers?: Movie[];
  error?: string | null;
}) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { token, requireAuth } = useAuth();
  const copy = movieCopy(language);
  const router = useRouter();
  const [current, setCurrent] = useState(movie);
  const [thread, setThread] = useState(comments);
  const [saved, setSaved] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  useEffect(() => {
    if (loading) return;
    setCurrent(movie);
    setThread(comments);
  }, [loading, movie, comments]);

  useEffect(() => {
    if (!movie) return;
    fetchWishlistIds()
      .then((ids) => setSaved(ids.includes(movie.id)))
      .catch(() => setSaved(false));
  }, [movie, token]);

  const lang = language === "en" ? "uz" : language;
  const title = current ? (current.title?.[lang] ?? current.title?.uz ?? "") : "";
  const description: MovieDescription | null = current?.description
    ? (current.description[lang] ?? current.description.uz ?? null)
    : null;
  const poster = current ? moviePosterUrl(current.homeImgPoster) : "";
  const posterImage = useImageReady(poster);
  const genres = current?.genre ? (current.genre[lang] ?? current.genre.uz ?? []) : [];
  const fadeMobile = `linear-gradient(to bottom, transparent 0%, ${colors.bg} 100%)`;
  const fadeDesktop = `linear-gradient(to bottom, transparent 0%, ${colors.bg}73 18%, ${colors.bg}e6 55%, ${colors.bg} 78%, ${colors.bg} 100%)`;

  async function onSave() {
    if (!current || !requireAuth()) return;
    try {
      const result = await toggleWishlistMovie(current.id);
      setSaved(result.saved);
    } catch {
      // token yo'q
    }
  }

  async function onReaction(type: "like" | "dislike") {
    if (!current) return;
    try {
      const result = await toggleMovieReaction(current.id, type);
      setCurrent({ ...current, like: result.like, dislike: result.dislike, userReaction: result.userReaction });
    } catch {
      // token yo'q
    }
  }

  async function loadMoreReplies(parent: MovieComment) {
    if (loadingMoreId) return;
    setLoadingMoreId(parent.id);
    try {
      const skip = parent.replies?.length ?? 0;
      const result = await fetchCommentReplies(movieId, parent.id, skip, 5);
      const existing = parent.replies ?? [];
      const merged = [...existing, ...result.replies.filter((reply) => !existing.some((item) => item.id === reply.id))];
      setThread((prev) => prev.map((item) => (item.id === parent.id ? { ...item, replies: merged, replyCount: result.replyCount } : item)));
    } catch {
      // javoblar yuklanmadi
    } finally {
      setLoadingMoreId(null);
    }
  }

  if (loading) {
    const chip = "h-[26px] shrink-0 animate-pulse rounded-full md:h-[34px]";
    return (
      <main className="@container relative h-full" style={{ backgroundColor: colors.bg }}>
        <div className="absolute inset-x-0 top-[var(--tg-chrome)] z-0 h-[108cqw] animate-pulse md:top-0 md:h-dvh" style={{ backgroundColor: bone }} />
        <div className="no-scrollbar relative z-[1] h-full overflow-y-auto">
          <div className="h-[calc(var(--tg-chrome)+108cqw)] shrink-0 md:h-dvh" />
          <div className="relative pb-[max(24px,env(safe-area-inset-bottom))]" style={{ backgroundColor: colors.bg }}>
            <div className="relative px-4">
              <div className="md:absolute md:bottom-full md:left-0 md:z-[3] md:flex md:h-dvh md:w-[min(560px,72%)] md:flex-col md:justify-end md:px-8 md:pb-[16vh]">
                <div className="relative z-[2] mt-3 mb-1.5 h-10 w-[62%] animate-pulse rounded-lg md:mt-0 md:h-16 md:w-[72%]" style={{ backgroundColor: bone }} />
                <div className="mt-2.5 flex gap-2 py-1">
                  <div className={`${chip} w-[72px] md:w-[89px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-[84px] md:w-[108px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-14 md:w-20`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-16 md:w-[84px]`} style={{ backgroundColor: bone }} />
                </div>
                <div className="mt-2 flex gap-2 py-1">
                  <div className={`${chip} w-14 md:w-[76px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-14 md:w-[76px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-16 md:w-[78px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-14 md:w-[67px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-[72px] md:w-[86px]`} style={{ backgroundColor: bone }} />
                </div>
                <div className="mt-2 flex gap-2.5">
                  <div className="h-11 flex-1 animate-pulse rounded-xl md:h-[52px]" style={{ backgroundColor: bone }} />
                  <div className="h-11 flex-1 animate-pulse rounded-xl md:h-[52px]" style={{ backgroundColor: bone }} />
                </div>
                <div className="mt-2 flex gap-2">
                  <div className={`${chip} w-[72px] md:w-[85px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-12 md:w-[62px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-12 md:w-[62px]`} style={{ backgroundColor: bone }} />
                  <div className={`${chip} w-9 md:w-11`} style={{ backgroundColor: bone }} />
                </div>
              </div>
              <div className="mt-3 md:mt-0 md:pt-16">
              <div
                className="relative z-[1] rounded-[14px] border px-3.5 py-3"
                style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
              >
                <div className="h-[22px] w-[110px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                <div className="mt-2 h-[42px] w-full animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                <div className="mt-2 h-[21px] w-[95px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
              </div>
              </div>
            </div>
            <section className="pt-3">
              <div className="mx-4 h-[22px] w-[100px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
              <div className="mt-2.5 flex overflow-hidden px-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="mr-3.5 w-[88px] shrink-0">
                    <div className="mx-auto h-[72px] w-[72px] animate-pulse rounded-full" style={{ backgroundColor: bone }} />
                    <div className="mt-2 h-4 w-full animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                  </div>
                ))}
              </div>
            </section>
            <section className="px-4 pt-2.5 pb-2">
              <div className="rounded-[14px] border px-3.5 py-3" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
                <div className="h-[26px] w-[72px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                <div className="mt-2.5 flex gap-2.5 border-t pt-2.5" style={{ borderColor: colors.borderSoft }}>
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: bone }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <div className="h-[18px] w-[83px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                    <div className="h-[18px] w-full animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                  </div>
                </div>
              </div>
            </section>
            <section className="pt-2 pb-6">
              <div className="mx-4 h-[22px] w-[140px] animate-pulse rounded-md" style={{ backgroundColor: bone }} />
              <div className="mt-3 flex overflow-hidden px-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="mr-3 w-[36cqw] shrink-0 md:w-[168px]">
                    <div className="aspect-[100/135] animate-pulse rounded-[14px]" style={{ backgroundColor: bone }} />
                    <div className="mt-2 h-[22px] w-full animate-pulse rounded-md" style={{ backgroundColor: bone }} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (error || !current) {
    return (
      <main className="flex h-full items-center justify-center px-6" style={{ backgroundColor: colors.bg }}>
        <p className="text-center" style={{ color: colors.textMuted }}>
          {error || copy.notFound}
        </p>
      </main>
    );
  }

  const specs = [
    current.specs?.year ? { key: "year", label: String(current.specs.year), Icon: CalendarIcon } : null,
    current.specs?.duration ? { key: "duration", label: `${current.specs.duration} ${copy.minutes}`, Icon: ClockIcon } : null,
    current.specs?.ageRating ? { key: "age", label: current.specs.ageRating, Icon: AgeRatingIcon } : null,
    ...(current.specs?.countries ?? []).map((country, index) => ({ key: `c-${index}`, label: country, Icon: GlobeIcon })),
  ].filter((item): item is { key: string; label: string; Icon: typeof CalendarIcon } => Boolean(item?.label));

  return (
    <main className="@container relative h-full" style={{ backgroundColor: colors.bg }}>
      <div className="pointer-events-none absolute inset-x-0 top-[var(--tg-chrome)] z-0 h-[108cqw] overflow-hidden md:top-0 md:h-dvh">
        {poster && !posterImage.ready ? <div className="absolute inset-0 z-0 animate-pulse" style={{ backgroundColor: bone }} /> : null}
        {poster ? (
          <img
            ref={posterImage.ref}
            src={poster}
            alt=""
            className="relative z-[1] h-full w-full object-cover object-top"
            onLoad={posterImage.onLoad}
            onError={posterImage.onError}
          />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: colors.panelSoft }} />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-[30%] md:block"
          style={{
            background: `linear-gradient(to right, ${colors.bg}66 0%, ${colors.bg}29 55%, transparent 100%)`,
          }}
        />
      </div>
      <div className="no-scrollbar relative z-[1] h-full overflow-y-auto">
        <div className="h-[calc(var(--tg-chrome)+108cqw)] md:h-dvh" />
        <div className="relative pb-[max(24px,env(safe-area-inset-bottom))]" style={{ backgroundColor: colors.bg }}>
          <div className="pointer-events-none absolute inset-x-0 bottom-full h-[calc(108cqw*0.42)] md:hidden" style={{ background: fadeMobile }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-full hidden h-[42dvh] md:block" style={{ background: fadeDesktop }} />
          <div className="relative px-4">
          <div className="md:absolute md:bottom-full md:left-0 md:z-[3] md:flex md:h-dvh md:w-[min(560px,72%)] md:flex-col md:justify-end md:px-8 md:pb-[16vh]">
          <h1
            className={`${oswald.className} relative z-[2] -mt-8 mb-1.5 text-[32px] leading-[40px] tracking-wide -skew-x-[14deg] md:mt-0 md:text-[56px] md:leading-[64px]`}
            style={{ color: colors.text }}
          >
            {title}
          </h1>
          <HorizontalScroll className="mt-2.5 gap-2 py-1">
            {specs.map((item) => (
              <span
                key={item.key}
                className="mr-2 inline-flex shrink-0 items-center gap-[5px] rounded-full border px-2.5 py-1 md:gap-2 md:px-3.5 md:py-1.5"
                style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
              >
                <span className="inline-flex md:[&_svg]:h-[18px] md:[&_svg]:w-[18px]">
                  <item.Icon size={14} color={colors.icon} />
                </span>
                <span className="text-[12px] leading-4 font-semibold md:text-[15px] md:leading-5">{item.label}</span>
              </span>
            ))}
          </HorizontalScroll>
          <HorizontalScroll className="mt-2 gap-2 py-1">
            {current.ratingImdb != null ? (
              <RatingChip src="/images/imdbnew.png" value={Number(current.ratingImdb).toFixed(1)} />
            ) : null}
            {current.ratingKinopoisk != null ? (
              <RatingChip src="/images/kinopoisk.jpg" value={Number(current.ratingKinopoisk).toFixed(1)} />
            ) : null}
            {genres.map((genre) => (
              <span
                key={genre}
                className="mr-2 inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[12px] leading-4 font-semibold md:px-3.5 md:py-1.5 md:text-[15px] md:leading-5"
                style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
              >
                {genre}
              </span>
            ))}
          </HorizontalScroll>
          <div className="mt-2 flex gap-2.5">
            {current.watchUrl ? (
              <a
                href={current.watchUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 flex-1 md:h-[52px] items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white"
                style={{ backgroundColor: colors.accentBright }}
              >
                <PlayIcon size={16} color="#FFFFFF" />
                {copy.watch}
              </a>
            ) : (
              <span
                className="flex h-11 flex-1 md:h-[52px] items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white opacity-60"
                style={{ backgroundColor: colors.accentBright }}
              >
                <PlayIcon size={16} color="#FFFFFF" />
                {copy.watch}
              </span>
            )}
            <button
              type="button"
              className="flex h-11 flex-1 md:h-[52px] items-center justify-center gap-2 rounded-xl border text-[14px] font-bold"
              style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
              onClick={() => setTrailerOpen(true)}
            >
              <VideoIcon size={16} color={colors.icon} />
              {copy.trailer}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <ReactionButton
              active={current.userReaction === "like"}
              activeColor={LIKE_ACTIVE}
              label={String(current.like || "0")}
              onClick={() => void onReaction("like")}
            >
              <LikeIcon size={18} color={current.userReaction === "like" ? LIKE_ACTIVE : colors.icon} filled={current.userReaction === "like"} />
            </ReactionButton>
            <ReactionButton
              active={current.userReaction === "dislike"}
              activeColor={DISLIKE_ACTIVE}
              label={String(current.dislike || "0")}
              onClick={() => void onReaction("dislike")}
            >
              <DislikeIcon size={18} color={current.userReaction === "dislike" ? DISLIKE_ACTIVE : colors.icon} filled={current.userReaction === "dislike"} />
            </ReactionButton>
            <ReactionButton label={String(current.commentCount ?? thread.length)} onClick={() => setCommentsOpen(true)}>
              <ChatBubbleIcon size={18} color={colors.icon} />
            </ReactionButton>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5"
              style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
            >
              <ShareIcon size={18} color={colors.icon} />
            </span>
          </div>
          </div>
          {description?.text ? (
            <div className="mt-3 rounded-[14px] border px-3.5 py-3" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
              <h2 className="text-[17px] leading-[22px] font-bold" style={{ color: colors.text }}>
                {copy.aboutTitle}
              </h2>
              <p className="mt-2 line-clamp-4 text-[14px] leading-[21px]" style={{ color: colors.text }}>
                {description.text}
              </p>
              <button type="button" className="mt-2 text-[14px] font-bold" style={{ color: colors.accentBright }} onClick={() => setDescOpen(true)}>
                {copy.readMore}
              </button>
            </div>
          ) : null}
          </div>

        {current.actors && current.actors.length > 0 ? (
          <section className="pt-3">
            <h2 className="px-4 text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.actorsTitle}
            </h2>
            <HorizontalScroll className="mt-2.5 px-4">
              {current.actors.map((actor) => (
                <ActorChip key={actor.id} actor={actor} />
              ))}
            </HorizontalScroll>
          </section>
        ) : null}

        <section className="px-4 pt-2.5 pb-2">
          <div className="rounded-[14px] border px-3.5 py-3" style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}>
            <h2 className="text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.commentsTitle}
            </h2>
            <button type="button" className="mt-2.5 flex w-full items-center gap-2" onClick={() => setCommentsOpen(true)}>
              <span
                className="flex h-11 min-w-0 flex-1 items-center rounded-full border px-4 text-[15px]"
                style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft, color: colors.textMuted }}
              >
                {copy.commentPlaceholder}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}>
                <SendIcon size={16} color={colors.textOnAccent} />
              </span>
            </button>
            {thread.length === 0 ? (
              <p className="mt-2 text-[13px] font-medium" style={{ color: colors.textMuted }}>
                {copy.noComments}
              </p>
            ) : (
              thread.slice(0, 5).map((item) => {
                const replies = item.replies ?? [];
                const replyCount = item.replyCount ?? replies.length;
                const hasMore = replies.length < replyCount;
                return (
                  <div key={item.id} className="mt-2.5 flex gap-2.5 border-t pt-2.5" style={{ borderColor: colors.borderSoft }}>
                    <UserAvatar name={authorName(item)} picture={item.authorPicture} size={40} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold" style={{ color: colors.text }}>
                          {authorName(item)}
                        </p>
                        <p className="text-[11px]" style={{ color: colors.textMuted }}>
                          {commentTime(item.createdAt)}
                        </p>
                      </div>
                      <p className="line-clamp-3 text-[13px] leading-[18px]" style={{ color: colors.text }}>
                        {item.text}
                      </p>
                      <button
                        type="button"
                        className="text-[13px] font-bold"
                        style={{ color: colors.accentBright }}
                        onClick={() => {
                          setReplyToId(item.id);
                          setCommentsOpen(true);
                        }}
                      >
                        {copy.reply}
                      </button>
                      {replies.map((reply) => (
                        <div key={reply.id} className="mt-2 flex gap-2.5">
                          <UserAvatar name={authorName(reply)} picture={reply.authorPicture} size={32} />
                          <div>
                            <p className="text-[12px] font-bold" style={{ color: colors.text }}>
                              {authorName(reply)}
                            </p>
                            <p className="line-clamp-2 text-[12px] leading-[17px]" style={{ color: colors.text }}>
                              {reply.text}
                            </p>
                          </div>
                        </div>
                      ))}
                      {hasMore ? (
                        <button
                          type="button"
                          className="mt-1 text-[13px] font-bold"
                          style={{ color: colors.accentBright }}
                          onClick={() => void loadMoreReplies(item)}
                        >
                          {loadingMoreId === item.id ? "..." : `${copy.moreReplies} (${replyCount - replies.length})`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            {thread.length > 5 ? (
              <button type="button" className="mt-2 text-[14px] font-bold" style={{ color: colors.accentBright }} onClick={() => setCommentsOpen(true)}>
                {`${copy.moreComments} (${Math.max(0, (current.commentCount ?? thread.length) - 5)})`}
              </button>
            ) : null}
          </div>
        </section>

        {similar.length > 0 ? (
          <section className="pt-2 pb-6" data-media-strip>
            <h2 className="px-4 text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.similarMovies}
            </h2>
            <HorizontalScroll className="mt-3 px-4">
              {similar.map((item) => (
                <SimilarMovieCard key={item.id} movie={item} language={language} />
              ))}
            </HorizontalScroll>
          </section>
        ) : null}
        </div>
      </div>

      <div
        className="absolute inset-x-0 z-20 flex items-center justify-between px-4"
        style={{ top: "var(--tg-chrome, 0px)", paddingTop: "calc(var(--tg-safe-pad, max(8px, env(safe-area-inset-top))) + var(--tg-home-gap, 0px))" }}
      >
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
          onClick={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
          onClick={() => void onSave()}
        >
          <BookmarkIcon size={18} color={saved ? SAVE_ACTIVE : colors.icon} filled={saved} />
        </button>
      </div>

      <MovieDescriptionModal open={descOpen} onClose={() => setDescOpen(false)} description={description} copy={copy} />
      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        movie={current}
        trailers={trailers}
        description={description}
        copy={copy}
        language={language}
        onSavedChange={(id, next) => {
          if (current && id === current.id) setSaved(next);
        }}
      />
      <CommentModal
        open={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setReplyToId(null);
        }}
        movieId={movieId}
        comments={thread}
        replyToId={replyToId}
        copy={copy}
        onCommentsChange={(next, count) => {
          setThread(next);
          if (count != null) setCurrent((prev) => (prev ? { ...prev, commentCount: count } : prev));
        }}
      />
    </main>
  );
}

function RatingChip({ src, value }: { src: string; value: string }) {
  const { colors } = useTheme();
  return (
    <span
      className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] leading-4 font-semibold md:gap-1.5 md:px-3.5 md:py-1.5 md:text-[15px] md:leading-5"
      style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
    >
      <img src={src} alt="" className="h-4 w-4 rounded-[3px] object-cover md:h-5 md:w-5" />
      {value}
    </span>
  );
}

function ReactionButton({
  children,
  label,
  active,
  activeColor,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  const { colors } = useTheme();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold md:px-3.5 md:text-[15px] md:leading-5"
      style={{
        backgroundColor: colors.panelSoft,
        borderColor: colors.borderSoft,
        color: active && activeColor ? activeColor : colors.text,
      }}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  );
}
