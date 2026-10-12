"use client";

import { useState } from "react";
import { createMovieComment, fetchCommentReplies, type MovieComment } from "@/api/movies";
import { UserAvatar } from "@/components/common/UserAvatar";
import { SendIcon } from "@/components/icons";
import type { MovieCopy } from "@/data/movieCopy";
import { useTheme } from "@/components/theme/theme-state";

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
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function send() {
    const value = text.trim();
    if (!value || busy) return;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative flex max-h-[82vh] w-full flex-col rounded-t-3xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
        style={{ backgroundColor: colors.bg }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ backgroundColor: colors.borderSoft }} />
        <h2 className="text-[17px] font-bold" style={{ color: colors.text }}>
          {copy.commentsTitle}
        </h2>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="py-2 text-[13px] font-medium" style={{ color: colors.textMuted }}>
              {copy.noComments}
            </p>
          ) : (
            comments.map((item) => <CommentLine key={item.id} movieId={movieId} comment={item} copy={copy} onCommentsChange={onCommentsChange} comments={comments} />)
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.commentPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-full border px-4 text-[15px] outline-none"
            style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft, color: colors.text }}
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
