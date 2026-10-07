import { Movie } from '../models/Movie.js';
import { MovieComment } from '../models/MovieComment.js';
import { Profile } from '../models/Profile.js';

const MAX_TEXT = 500;
const PREVIEW_REPLIES = 1;

export type CommentDto = {
  id: string;
  movieId: number;
  userId: string;
  text: string;
  createdAt: string;
  parentId: string | null;
  replyToUserId: string | null;
  authorName?: string;
  authorPicture?: string;
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
  authorName?: string | null;
  authorPicture?: string | null;
  createdAt?: Date;
}): CommentDto {
  return {
    id: doc._id.toString(),
    movieId: doc.movieId,
    userId: doc.userId,
    text: doc.text,
    parentId: doc.parentId ?? null,
    replyToUserId: doc.replyToUserId ?? null,
    authorName: doc.authorName ?? '',
    authorPicture: doc.authorPicture ?? '',
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

function isObjectIdString(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

async function authorMapForUserIds(userIds: string[]) {
  const ids = [
    ...new Set(
      userIds
        .map((id) => String(id ?? '').trim())
        .filter((id) => isObjectIdString(id))
    ),
  ];
  if (ids.length === 0) {
    return new Map<string, { name: string; picture: string }>();
  }

  try {
    const profiles = await Profile.find({ _id: { $in: ids } })
      .select({ name: 1, picture: 1 })
      .lean();

    const map = new Map<string, { name: string; picture: string }>();
    for (const p of profiles) {
      map.set(String(p._id), {
        name: String(p.name ?? '').trim(),
        picture: String(p.picture ?? '').trim(),
      });
    }
    return map;
  } catch {
    return new Map<string, { name: string; picture: string }>();
  }
}

function withAuthorFallback(
  dto: CommentDto,
  authors: Map<string, { name: string; picture: string }>
): CommentDto {
  const fromProfile = authors.get(dto.userId);
  return {
    ...dto,
    authorName: dto.authorName?.trim() || fromProfile?.name || '',
    authorPicture: dto.authorPicture?.trim() || fromProfile?.picture || '',
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

  const drafts: CommentDto[] = [];
  const userIds: string[] = [];
  for (const row of rows) {
    const id = row._id.toString();
    const replyCount = await MovieComment.countDocuments({ parentId: id });
    const preview = await MovieComment.find({ parentId: id })
      .sort({ createdAt: 1 })
      .limit(PREVIEW_REPLIES)
      .lean();
    const top = toDto(row);
    const replies = preview.map(toDto);
    userIds.push(top.userId, ...replies.map((r) => r.userId));
    drafts.push({
      ...top,
      replyCount,
      replies,
    });
  }

  const authors = await authorMapForUserIds(userIds);
  return drafts.map((item) => ({
    ...withAuthorFallback(item, authors),
    replies: (item.replies ?? []).map((r) => withAuthorFallback(r, authors)),
  }));
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

  const replies = rows.map(toDto);
  const authors = await authorMapForUserIds(replies.map((r) => r.userId));
  return {
    replies: replies.map((r) => withAuthorFallback(r, authors)),
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
  rawParentId?: string | null,
  author?: { authorName?: string; authorPicture?: string }
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

  const authorName = String(author?.authorName ?? '').trim();
  const authorPicture = String(author?.authorPicture ?? '').trim();
  const doc = await MovieComment.create({
    userId,
    movieId,
    text,
    parentId,
    replyToUserId,
    authorName,
    authorPicture,
  });
  const dto = toDto(doc.toObject ? doc.toObject() : doc);
  return {
    ...dto,
    authorName: dto.authorName || authorName,
    authorPicture: dto.authorPicture || authorPicture,
  };
}
