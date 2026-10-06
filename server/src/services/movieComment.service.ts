import { Movie } from '../models/Movie.js';
import { MovieComment } from '../models/MovieComment.js';

const MAX_TEXT = 500;
const PREVIEW_REPLIES = 2;

export type CommentDto = {
  id: string;
  movieId: number;
  userId: string;
  text: string;
  createdAt: string;
  parentId: string | null;
  replyToUserId: string | null;
  replyCount?: number;
  replies?: CommentDto[];
};

function toDto(doc: {
  _id: { toString(): string };
  movieId: number;
  userId: string;
  text: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  createdAt?: Date;
}): CommentDto {
  return {
    id: doc._id.toString(),
    movieId: doc.movieId,
    userId: doc.userId,
    text: doc.text,
    parentId: doc.parentId ?? null,
    replyToUserId: doc.replyToUserId ?? null,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

function isTopLevelFilter() {
  return {
    $or: [{ parentId: null }, { parentId: { $exists: false } }],
  };
}

export async function countComments(movieId: number) {
  return MovieComment.countDocuments({ movieId, ...isTopLevelFilter() });
}

export async function listComments(movieId: number, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const rows = await MovieComment.find({ movieId, ...isTopLevelFilter() })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  const result: CommentDto[] = [];
  for (const row of rows) {
    const id = row._id.toString();
    const replyCount = await MovieComment.countDocuments({ parentId: id });
    const preview = await MovieComment.find({ parentId: id })
      .sort({ createdAt: 1 })
      .limit(PREVIEW_REPLIES)
      .lean();
    result.push({
      ...toDto(row),
      replyCount,
      replies: preview.map(toDto),
    });
  }
  return result;
}

export async function listReplies(
  movieId: number,
  parentId: string,
  skip = 0,
  limit = 5
) {
  const parent = await MovieComment.findById(parentId).lean();
  if (!parent || parent.movieId !== movieId) {
    return null;
  }

  const safeSkip = Math.max(0, skip);
  const safeLimit = Math.min(30, Math.max(1, limit));
  const replyCount = await MovieComment.countDocuments({ parentId });
  const rows = await MovieComment.find({ parentId })
    .sort({ createdAt: 1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean();

  return {
    replies: rows.map(toDto),
    replyCount,
    skip: safeSkip,
    limit: safeLimit,
    hasMore: safeSkip + rows.length < replyCount,
  };
}

export async function createComment(
  userId: string,
  movieId: number,
  rawText: string,
  rawParentId?: string | null
) {
  const movie = await Movie.collection.findOne({ id: movieId });
  if (!movie) return null;

  const text = String(rawText ?? '').trim();
  if (!text) {
    throw new Error('EMPTY_TEXT');
  }
  if (text.length > MAX_TEXT) {
    throw new Error('TEXT_TOO_LONG');
  }

  let parentId: string | null = null;
  let replyToUserId: string | null = null;
  const parentRaw = String(rawParentId ?? '').trim();
  if (parentRaw) {
    const parent = await MovieComment.findById(parentRaw).lean();
    if (!parent || parent.movieId !== movieId) {
      throw new Error('INVALID_PARENT');
    }
    // Always attach to top-level thread root.
    parentId = parent.parentId ? parent.parentId : parent._id.toString();
    // Mention the user of the comment being answered.
    replyToUserId = parent.userId;
  }

  const doc = await MovieComment.create({
    userId,
    movieId,
    text,
    parentId,
    replyToUserId,
  });
  return toDto(doc);
}
