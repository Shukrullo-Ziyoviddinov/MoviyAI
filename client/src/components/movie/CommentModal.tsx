"use client";

import { useEffect, useRef, useState } from "react";
import { createMovieComment, fetchCommentReplies, type MovieComment } from "@/api/movies";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useMobileBackClose } from "@/components/common/useMobileBackClose";
import { CloseIcon, SendIcon } from "@/components/icons";
import type { MovieCopy } from "@/data/movieCopy";
import { useAuth } from "@/components/auth/auth-state";
import { useTheme } from "@/components/theme/theme-state";
import { SHEET_CLOSE_MS, SHEET_EASE, SHEET_OPEN_MS, useSheetMotion } from "@/components/movie/useSheetMotion";

function authorName(comment: { authorName?: string; userId: string }) {
  const name = String(comment.authorName ?? "").trim();
  if (name) return name;
  const tail = comment.userId.replace(/^user_/, "").slice(-4);
  return tail ? `User ${tail}` : "User";
}

export function CommentModal({
  open,
  onClose,
  movieId,
  comments,
  replyToId,
  copy,
  onCommentsChange,
}: {
  open: boolean;
  onClose: () => void;
  movieId: number;
  comments: MovieComment[];
  replyToId: string | null;
  copy: MovieCopy;
  onCommentsChange: (comments: MovieComment[], commentCount?: number) => void;
}) {
  const { colors } = useTheme();
  const { requireAuth } = useAuth();
  const sheet = useSheetMotion(open, onClose);
  useMobileBackClose(open && !sheet.desktop, onClose);
  const sheetRef = useRef<HTMLDivElement>(null);
  const collapsedH = useRef(0);
  const drag = useRef<{ x: number; y: number; t: number; origin: number; active: boolean; fromFull: boolean } | null>(null);
  const dragYRef = useRef(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [sheetPx, setSheetPx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDragY(0);
    setSheetPx(null);
    setExpanded(false);
    setDragging(false);
  }, [open]);

  if (!sheet.mounted) return null;

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
    const full = window.innerHeight;
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
    const full = window.innerHeight;
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

  async function send() {
    const value = text.trim();
    if (!value || busy || !requireAuth()) return;
    setBusy(true);
    try {
      const result = await createMovieComment(movieId, value, replyToId);
      const next = replyToId
        ? comments.map((item) =>
            item.id === replyToId
              ? { ...item, replies: [...(item.replies ?? []), result.comment], replyCount: (item.replyCount ?? 0) + 1 }
              : item,
          )
        : [result.comment, ...comments];
      onCommentsChange(next, result.commentCount);
      setText("");
      if (!replyToId) onClose();
    } catch {
      // login yoki tarmoq xatosi
    } finally {
      setBusy(false);
    }
  }

  const motion =
    dragging || !sheet.ready
      ? "none"
      : `transform ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}, height 280ms ${SHEET_EASE}, opacity ${sheet.shown ? SHEET_OPEN_MS : SHEET_CLOSE_MS}ms ${SHEET_EASE}`;
  const backdrop = dragging ? Math.max(0, 0.55 * (1 - dragY / Math.max(collapsedH.current, 1))) : sheet.backdrop;
  const transform = sheet.desktop || dragY === 0 ? sheet.transform : `translateY(${dragY}px)`;

  return (
    <div className={`fixed inset-0 z-50 flex ${sheet.desktop ? "items-center justify-center p-6" : "items-end"}`}>
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
            ? "relative flex max-h-[82vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border"
            : `relative flex w-full flex-col overflow-hidden border-t ${expanded ? "h-dvh rounded-none" : "max-h-[82vh] rounded-t-[22px]"}`
        }
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
          transform,
          opacity: sheet.desktop ? (sheet.shown ? 1 : 0) : 1,
          transition: motion,
          height: !sheet.desktop && sheetPx != null ? sheetPx : undefined,
          maxHeight: !sheet.desktop && (sheetPx != null || expanded) ? "none" : undefined,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {sheet.desktop ? (
          <div className="relative flex items-center justify-center px-4 pt-4 pb-3">
            <h2 className="text-center text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.commentsTitle}
            </h2>
            <button type="button" aria-label="Yopish" className="absolute right-3 flex h-9 w-9 items-center justify-center" onClick={onClose}>
              <CloseIcon size={22} color={colors.icon} />
            </button>
          </div>
        ) : (
          <div
            className="px-4 pt-3 pb-3.5 select-none"
            style={{ touchAction: "none" }}
            onPointerDown={onDragDown}
            onPointerMove={onDragMove}
            onPointerUp={onDragUp}
            onPointerCancel={onDragUp}
          >
            <div className="mx-auto mb-3 h-1 w-[42px] rounded-full" style={{ backgroundColor: colors.border }} />
            <h2 className="px-1 text-center text-[17px] font-bold" style={{ color: colors.text }}>
              {copy.commentsTitle}
            </h2>
          </div>
        )}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-[14px] font-medium" style={{ color: colors.textMuted }}>
              {copy.noComments}
            </p>
          ) : (
            comments.map((item) => <CommentLine key={item.id} movieId={movieId} comment={item} copy={copy} onCommentsChange={onCommentsChange} comments={comments} />)
          )}
        </div>
        <div
          className="flex items-center gap-2 border-t px-3.5 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]"
          style={{ borderColor: colors.borderSoft, backgroundColor: colors.panel }}
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.commentPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-full border px-4 text-[15px] outline-none"
            style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, color: colors.text }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void send();
            }}
          />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.accent }}
            onClick={() => void send()}
            disabled={busy}
          >
            <SendIcon size={16} color={colors.textOnAccent} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentLine({
  movieId,
  comment,
  comments,
  copy,
  onCommentsChange,
}: {
  movieId: number;
  comment: MovieComment;
  comments: MovieComment[];
  copy: MovieCopy;
  onCommentsChange: (comments: MovieComment[], commentCount?: number) => void;
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const replies = comment.replies ?? [];
  const replyCount = comment.replyCount ?? replies.length;
  const hasMore = replies.length < replyCount;

  async function more() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await fetchCommentReplies(movieId, comment.id, replies.length, 5);
      const merged = [...replies, ...result.replies.filter((reply) => !replies.some((item) => item.id === reply.id))];
      onCommentsChange(
        comments.map((item) => (item.id === comment.id ? { ...item, replies: merged, replyCount: result.replyCount } : item)),
      );
    } catch {
      // javoblar yuklanmadi
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2.5 border-t py-2.5" style={{ borderColor: colors.borderSoft }}>
      <UserAvatar name={authorName(comment)} picture={comment.authorPicture} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold" style={{ color: colors.text }}>
          {authorName(comment)}
        </p>
        <p className="text-[13px] leading-[18px]" style={{ color: colors.text }}>
          {comment.text}
        </p>
        {replies.map((reply) => (
          <div key={reply.id} className="mt-2 flex gap-2.5">
            <UserAvatar name={authorName(reply)} picture={reply.authorPicture} size={32} />
            <p className="text-[12px] leading-[17px]" style={{ color: colors.text }}>
              <span className="font-bold">{authorName(reply)} </span>
              {reply.text}
            </p>
          </div>
        ))}
        {hasMore ? (
          <button type="button" className="mt-1 text-[13px] font-bold" style={{ color: colors.accentBright }} onClick={() => void more()}>
            {loading ? "..." : `${copy.moreReplies} (${replyCount - replies.length})`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
