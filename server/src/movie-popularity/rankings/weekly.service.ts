import type { PipelineStage } from 'mongoose';
import { MovieSearchEvent } from '../models.js';
import { rankedMovieStages } from './movie-ranking.pipeline.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export function weeklyRankingPipeline(now: Date): PipelineStage[] {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid ranking time');
  return [
    { $match: { occurredAt: { $gte: new Date(now.getTime() - WEEK_MS), $lte: now }, movieId: { $gt: 0 } } },
    { $group: { _id: '$movieId', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    ...rankedMovieStages(),
  ];
}

type RankedMovie = { id: number; searchCount: number; [key: string]: unknown };
/** Coalesce concurrent readers; short caching bounds the cost of the seven-day aggregation. */
export function createWeeklyRanking(deps = {
  now: () => Date.now(),
  read: (now: Date): Promise<RankedMovie[]> => MovieSearchEvent.aggregate<RankedMovie>(weeklyRankingPipeline(now)).exec(),
}) {
  let cached: RankedMovie[] | null = null, expiresAt = 0;
  let pending: Promise<RankedMovie[]> | null = null;
  return async () => {
    const now = deps.now();
    if (cached && now < expiresAt) return cached;
    if (pending) return pending;
    pending = deps.read(new Date(now)).then(rows => {
      cached = rows; expiresAt = deps.now() + 15000; return rows;
    }).finally(() => { pending = null; });
    return pending;
  };
}
export const weeklyTopSearchedMovies = createWeeklyRanking();
