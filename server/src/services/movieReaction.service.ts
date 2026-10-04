import { Movie } from '../models/Movie.js';
import { MovieReaction } from '../models/MovieReaction.js';

export type ReactionType = 'like' | 'dislike';

function parseCount(value: unknown) {
  const n = Number(String(value ?? '0').trim() || '0');
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function toCountString(n: number) {
  return String(Math.max(0, n));
}

export async function getUserReaction(userId: string, movieId: number) {
  const row = await MovieReaction.findOne({ userId, movieId }).lean();
  return (row?.type as ReactionType | undefined) ?? null;
}

export async function toggleMovieReaction(
  userId: string,
  movieId: number,
  nextType: ReactionType
) {
  const movie = await Movie.findOne({ id: movieId }).lean();
  if (!movie) {
    return null;
  }

  let likeCount = parseCount(movie.like);
  let dislikeCount = parseCount(movie.dislike);
  const existing = await MovieReaction.findOne({ userId, movieId });

  let userReaction: ReactionType | null = nextType;

  if (!existing) {
    if (nextType === 'like') likeCount += 1;
    else dislikeCount += 1;
    await MovieReaction.create({ userId, movieId, type: nextType });
  } else if (existing.type === nextType) {
    if (nextType === 'like') likeCount -= 1;
    else dislikeCount -= 1;
    await existing.deleteOne();
    userReaction = null;
  } else {
    if (existing.type === 'like') {
      likeCount -= 1;
      dislikeCount += 1;
    } else {
      dislikeCount -= 1;
      likeCount += 1;
    }
    existing.type = nextType;
    await existing.save();
  }

  const like = toCountString(likeCount);
  const dislike = toCountString(dislikeCount);

  await Movie.updateOne(
    { id: movieId },
    {
      $set: { like, dislike },
      $unset: { movieDetailPoster: 1 },
    }
  );

  return {
    movieId,
    like,
    dislike,
    userReaction,
  };
}
