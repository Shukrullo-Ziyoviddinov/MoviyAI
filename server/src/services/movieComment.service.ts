import { Movie } from '../models/Movie.js';
import { MovieComment } from '../models/MovieComment.js';

const MAX_TEXT = 500;

export type CommentDto = {
  id: string;
  movieId: number;
  userId: string;
  text: string;
  createdAt: string;
};

function toDto(doc: {
  _id: { toString(): string };
  movieId: number;
  userId: string;
  text: string;
  createdAt?: Date;
}): CommentDto {
  return {
    id: doc._id.toString(),
    movieId: doc.movieId,
    userId: doc.userId,
    text: doc.text,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export async function countComments(movieId: number) {
  return MovieComment.countDocuments({ movieId });
}

export async function listComments(movieId: number, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const rows = await MovieComment.find({ movieId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
  return rows.map(toDto);
}

export async function createComment(
  userId: string,
  movieId: number,
  rawText: string
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

  const doc = await MovieComment.create({ userId, movieId, text });
  return toDto(doc);
}
