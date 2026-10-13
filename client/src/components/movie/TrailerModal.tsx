"use client";

import { useEffect, useRef, useState } from "react";
import { type Movie, type MovieDescription } from "@/api/movies";
import { fetchWishlistIds, toggleWishlistMovie } from "@/api/wishlist";
import { useAuth } from "@/components/auth/auth-state";
import { useMobileBackClose } from "@/components/common/useMobileBackClose";
import { BookmarkIcon, CloseIcon, PlayIcon } from "@/components/icons";
import type { AppLanguage } from "@/components/language/language-state";
import { SHEET_CLOSE_MS, SHEET_EASE, SHEET_OPEN_MS, useSheetMotion } from "@/components/movie/useSheetMotion";
import { useTheme } from "@/components/theme/theme-state";
import type { MovieCopy } from "@/data/movieCopy";
import { extractYoutubeVideoId, youtubeThumbnailUrl } from "@/utils/youtube";

export function TrailerModal({
  open,
  onClose,
  movie,
  trailers,
  description,
  copy,
  language,
  onSavedChange,
}: {
  open: boolean;
  onClose: () => void;
  movie: Movie | null;
  trailers: Movie[];
  description: MovieDescription | null;
  copy: MovieCopy;
  language: AppLanguage;
  onSavedChange?: (movieId: number, saved: boolean) => void;
}) {
  const { colors } = useTheme();
  const { token, requireAuth } = useAuth();
  const sheet = useSheetMotion(open, onClose);
  useMobileBackClose(open && !sheet.desktop, onClose);
  const sheetRef = useRef<HTMLDivElement>(null);
  const collapsedH = useRef(0);
  const drag = useRef<{ x: number; y: number; t: number; origin: number; active: boolean; fromFull: boolean } | null>(null);
  const dragYRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [sheetPx, setSheetPx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState<Movie | null>(movie);
  const [similar, setSimilar] = useState<Movie[]>(trailers);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const lang = language === "en" ? "uz" : language;

  useEffect(() => {
    if (!open || !movie) return;
    setActive(movie);
  }, [open, movie]);

  useEffect(() => {
    if (!open) return;
    setDragY(0);
    setSheetPx(null);
    setExpanded(false);
    setDragging(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetchWishlistIds()
      .then(setSavedIds)
      .catch(() => setSavedIds([]));
  }, [open, token]);

  useEffect(() => {
    if (!open || !active) return;
    let alive = true;
    if (movie && active.id === movie.id) setSimilar(trailers);
    fetch(`/api/similar-trailers/${active.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; data?: Movie[] };
        if (!response.ok || !data.ok || !Array.isArray(data.data)) throw new Error("failed");
        return data.data;
      })
      .then((rows) => {
        if (alive) setSimilar(rows.filter((item) => item.id !== active.id));
      })
      .catch(() => {
        if (!alive) return;
        if (!(movie && active.id === movie.id)) setSimilar([]);
      });
    return () => {
      alive = false;
    };
  }, [open, active, movie, trailers]);

  if (!sheet.mounted || !active) return null;

  function sheetFullHeight() {
    return sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
  }

  function onDragDown(event: React.PointerEvent<HTMLDivElement>) {
    if (sheet.desktop || event.button !== 0) return;
    const node = sheetRef.current;
    if (!node) return;
    const origin = node.offsetHeight;
    if (!expanded) collapsedH.current = origin;
    drag.current = { x: event.clientX, y: event.clientY, t: performance.now(), origin, active: false, fromFull: expanded };
    dragYRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDragMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || sheet.desktop) return;
    const dy = event.clientY - state.y;
    const dx = event.clientX - state.x;
    if (!state.active) {
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dy) < 8) return;
      state.active = true;
      setDragging(true);
    }
    const full = sheetFullHeight();
    const collapsed = collapsedH.current || state.origin;
    if (state.fromFull) {
      setSheetPx(Math.min(full, Math.max(collapsed, full - Math.max(0, dy))));
      dragYRef.current = 0;
      setDragY(0);
      return;
    }
    if (dy < 0) {
      const travel = Math.max(0, full - collapsed);
      setSheetPx(Math.min(full, collapsed + Math.min(travel, -dy * 1.35)));
      dragYRef.current = 0;
      setDragY(0);
      return;
    }
    setSheetPx(collapsed);
    dragYRef.current = dy;
    setDragY(dy);
  }

  function onDragUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.active || sheet.desktop) return;
    const dy = event.clientY - state.y;
    const elapsed = Math.max(performance.now() - state.t, 1);
    const velocity = (dy / elapsed) * 1000;
    const full = sheetFullHeight();
    const collapsed = collapsedH.current || state.origin;
    const travel = Math.max(1, full - collapsed);
    const heightNow = sheetRef.current?.offsetHeight ?? collapsed;
    const shifted = dragYRef.current;
    setDragging(false);

    if (state.fromFull) {
      if (heightNow < collapsed + travel * 0.55 || velocity > 700) {
        setSheetPx(collapsed);
        setExpanded(false);
        window.setTimeout(() => setSheetPx(null), 280);
      } else {
        setSheetPx(full);
        setExpanded(true);
      }
      setDragY(0);
      return;
    }

    if (heightNow > collapsed + travel * 0.18 || velocity < -500) {
      setSheetPx(full);
      setExpanded(true);
      setDragY(0);
      return;
    }
    if (shifted > collapsed * 0.16 || velocity > 800) {
      const from = Math.max(0, dy);
      setDragY(from);
      window.requestAnimationFrame(() => {
        setDragY(Math.max(collapsed, heightNow));
        window.setTimeout(onClose, SHEET_CLOSE_MS);
      });
      return;
    }
    setDragY(0);
    setSheetPx(collapsed);
    window.setTimeout(() => setSheetPx(null), 280);
  }

  const saved = savedIds.includes(active.id);

  async function onSave() {
    if (saveBusy || !active || !requireAuth()) return;
    const movieId = active.id;
    setSaveBusy(true);
    try {
      const result = await toggleWishlistMovie(movieId);
      setSavedIds((prev) => (result.saved ? [...prev.filter((id) => id !== movieId), movieId] : prev.filter((id) => id !== movieId)));
      onSavedChange?.(movieId, result.saved);
    } catch {
      // token yo'q
    } finally {
      setSaveBusy(false);
    }
  }

  const videoId = extractYoutubeVideoId(active.trailers);
  const videoBlock = videoId ? (
    <div className="aspect-video overflow-hidden rounded-[14px] bg-black">
      <iframe
        key={videoId}
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
  );
  const activeDescription = active.id === movie?.id ? description : (active.description?.[lang] ?? active.description?.uz ?? null);
  const title = active.title[lang] ?? active.title.uz;
  const motion =
    dragging || !sheet.ready
      ? "none"
      : `transform ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}, height 280ms ${SHEET_EASE}, opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`;
  const backdrop = dragging ? Math.max(0, 0.55 * (1 - dragY / Math.max(collapsedH.current, 1))) : sheet.backdrop;
  const transform = sheet.desktop || dragY === 0 ? sheet.transform : `translateY(${dragY}px)`;

  return (
    <div className={`absolute inset-0 z-50 flex ${sheet.desktop ? "items-center justify-center p-6" : "items-end"}`}>
      <button
        type="button"
        aria-label="Yopish"
        ref={sheet.bindBackdrop}
        className="absolute inset-0 border-0 bg-black"
        style={{
          opacity: backdrop,
          transition: dragging || !sheet.ready ? "none" : `opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`,
        }}
        onClick={onClose}
      />
      <div
        ref={(node) => {
          sheetRef.current = node;
          sheet.bindSheet(node);
        }}
        className={
          sheet.desktop
            ? "relative flex max-h-[82vh] w-full max-w-[960px] flex-col overflow-hidden rounded-3xl border"
            : `relative flex w-full flex-col overflow-hidden border-t ${expanded ? "h-full rounded-none" : "max-h-[82vh] rounded-t-[22px]"}`
        }
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
          transform,
          height: !sheet.desktop && sheetPx != null ? sheetPx : undefined,
          maxHeight: !sheet.desktop && (sheetPx != null || expanded) ? "none" : undefined,
          opacity: sheet.desktop ? (sheet.shown ? 1 : 0) : 1,
          transition: motion,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {sheet.desktop ? (
          <div className="flex items-center justify-end px-3 pt-3">
            <button type="button" aria-label="Yopish" className="flex h-9 w-9 items-center justify-center" onClick={onClose}>
              <CloseIcon size={22} color={colors.icon} />
            </button>
          </div>
        ) : (
          <div
            className="px-4 pt-2.5 pb-2 select-none"
            style={{ touchAction: "none" }}
            onPointerDown={onDragDown}
            onPointerMove={onDragMove}
            onPointerUp={onDragUp}
            onPointerCancel={onDragUp}
          >
            <div className="mx-auto h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
          </div>
        )}

        {!sheet.desktop ? <div className="shrink-0 px-4 pb-2">{videoBlock}</div> : null}

        <div className="@container no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-4 @min-[720px]:flex-row @min-[720px]:items-start">
            <div className="min-w-0 flex-1 @min-[720px]:sticky @min-[720px]:top-0 @min-[720px]:self-start">
              {sheet.desktop ? videoBlock : null}
              <h2 className="px-1 text-[20px] font-bold @min-[720px]:mt-3" style={{ color: colors.text }}>
                {title}
              </h2>
              {activeDescription?.text ? (
                <p className="mt-2 line-clamp-2 px-1 text-[15px] leading-[21px]" style={{ color: colors.textMuted }}>
                  {activeDescription.text}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2.5">
                {active.watchUrl ? (
                  <a
                    href={active.watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white md:h-11"
                    style={{ backgroundColor: colors.accentBright }}
                  >
                    <PlayIcon size={16} color="#FFFFFF" />
                    {copy.watch}
                  </a>
                ) : (
                  <span
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white opacity-60 md:h-11"
                    style={{ backgroundColor: colors.accentBright }}
                  >
                    <PlayIcon size={16} color="#FFFFFF" />
                    {copy.watch}
                  </span>
                )}
                <button
                  type="button"
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold disabled:opacity-60 md:h-11"
                  style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
                  onClick={() => void onSave()}
                  disabled={saveBusy}
                >
                  <BookmarkIcon size={16} color={saved ? colors.accent : colors.icon} filled={saved} />
                  {copy.save}
                </button>
              </div>
            </div>

            {similar.length > 0 ? (
              <div className="min-w-0 @min-[720px]:w-[42%] @min-[720px]:max-w-[380px]">
                <h3 className="px-1 text-[18px] font-bold" style={{ color: colors.text }}>
                  {copy.similarTrailers}
                </h3>
                <div className="mt-2.5 flex flex-col gap-2">
                  {similar.map((item) => (
                    <SimilarTrailerRow key={item.id} movie={item} language={lang} onPress={setActive} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarTrailerRow({
  movie,
  language,
  onPress,
}: {
  movie: Movie;
  language: "uz" | "ru";
  onPress: (movie: Movie) => void;
}) {
  const { colors } = useTheme();
  const title = movie.title[language] ?? movie.title.uz;
  const text = movie.description?.[language]?.text ?? movie.description?.uz?.text ?? "";
  const thumb = youtubeThumbnailUrl(movie.trailers);

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-[14px] border p-2 text-left"
      style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
      onClick={() => onPress(movie)}
    >
      {thumb ? (
        <img src={thumb} alt="" className="h-[86px] w-[158px] shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span className="h-[86px] w-[158px] shrink-0 rounded-[10px]" style={{ backgroundColor: colors.bgDeep }} />
      )}
      <span className="min-w-0 flex-1 pr-1">
        <span className="block truncate text-[16px] font-bold" style={{ color: colors.text }}>
          {title}
        </span>
        {text ? (
          <span className="mt-1 line-clamp-2 block text-[13px] leading-[18px] font-normal" style={{ color: colors.textMuted }}>
            {text}
          </span>
        ) : null}
      </span>
    </button>
  );
}
