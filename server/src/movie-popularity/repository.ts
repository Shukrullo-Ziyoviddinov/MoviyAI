import mongoose from 'mongoose';
import { ChatTurn } from '../ai/models/conversation.model.js';
import { BotUpdate } from '../bot/models.js';
import { Movie } from '../models/Movie.js';
import { prepareCatalogDraft } from '../ai/catalog/mappers/movie.mapper.js';
import { movieMatchInput } from '../ai/catalog/services/catalog-match.service.js';
import type { MovieSearchResult } from '../ai/types/movie-search.types.js';
import type { MovieMatchInput } from '../ai/catalog/types/catalog-match.types.js';
import { MovieSearchEvent, MovieSearchTotal } from './models.js';
import { isCountableMovieSearch } from './policy.js';

export interface SearchEvent { id: string; identity: MovieMatchInput; catalogId: number | null; attempts: number }

async function enqueue(id: string, movie: MovieSearchResult, occurredAt: Date) {
  if (!isCountableMovieSearch(movie)) return;
  const identity = movieMatchInput(prepareCatalogDraft(movie, { language: movie.language ?? 'uz' }));
  try {
    await MovieSearchEvent.updateOne({ _id: id }, { $setOnInsert: { identity, catalogId: movie.catalogId ?? null, occurredAt } }, { upsert: true });
  } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
}

/** Transfer atomic completion flags to independent events before counting. Safe across restarts. */
export async function dispatchSearchEvents(scope?: { userId: string; conversationId: string }) {
  const due = { $or: [{ popularityRetryAt: { $exists: false } }, { popularityRetryAt: { $lte: new Date() } }] };
  const turns = await ChatTurn.find({ ...scope, ...(!scope ? due : {}), status: 'completed', origin: { $ne: 'telegram' }, popularityPending: true })
    .select('_id movie answerAt createdAt').sort({ createdAt: 1 }).limit(20).lean();
  for (const turn of turns) {
    try {
      await enqueue(`ui:${turn._id}`, turn.movie, turn.answerAt ?? turn.createdAt);
      await ChatTurn.updateOne({ _id: turn._id }, { $set: { popularityPending: false } });
    } catch (error) {
      if (scope) throw error; // Deletion must not discard an untransferred event.
      await ChatTurn.updateOne({ _id: turn._id }, { $set: { popularityRetryAt: new Date(Date.now() + 60000) } }).catch(() => {});
      console.warn('[MOVIE_POPULARITY] UI event transfer deferred');
    }
  }
  if (scope) return turns.length;
  const updates = await BotUpdate.find({ ...due, popularityPending: true, result: { $ne: null } })
    .select('_id result resultAt createdAt').sort({ createdAt: 1 }).limit(20).lean();
  for (const update of updates) {
    try {
      const result = update.result as { movie?: MovieSearchResult };
      if (result.movie) await enqueue(`telegram:${update._id}`, result.movie, update.resultAt ?? update.createdAt);
      await BotUpdate.updateOne({ _id: update._id }, { $set: { popularityPending: false } });
    } catch {
      await BotUpdate.updateOne({ _id: update._id }, { $set: { popularityRetryAt: new Date(Date.now() + 60000) } }).catch(() => {});
      console.warn('[MOVIE_POPULARITY] Telegram event transfer deferred');
    }
  }
  return turns.length + updates.length;
}

export async function preserveConversationSearches(userId: string, conversationId: string) {
  while (await dispatchSearchEvents({ userId, conversationId }) === 20) { /* Preserve before deleting turns. */ }
}

export async function pendingSearchEvents(): Promise<SearchEvent[]> {
  const rows = await MovieSearchEvent.find({ movieId: null, nextAttemptAt: { $lte: new Date() } }).sort({ nextAttemptAt: 1 }).limit(20).lean();
  return rows.map(row => ({ id: row._id, identity: row.identity as MovieMatchInput, catalogId: row.catalogId ?? null, attempts: row.attempts }));
}

export async function resolveSearchEvent(eventId: string, movieId: number) {
  await mongoose.connection.transaction(async session => {
    const result = await MovieSearchEvent.updateOne({ _id: eventId, movieId: null }, { $set: { movieId } }, { session });
    if (result.modifiedCount) await MovieSearchTotal.updateOne({ _id: movieId }, { $inc: { count: 1 } }, { session, upsert: true });
  });
}

export async function deferSearchEvent(event: SearchEvent) {
  await MovieSearchEvent.updateOne({ _id: event.id, movieId: null }, {
    $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + Math.min(300000, 15000 * 2 ** Math.min(event.attempts, 5))) },
  });
}

export async function topSearchedMovies() {
  return MovieSearchTotal.aggregate([
    { $match: { count: { $gt: 0 } } }, { $sort: { count: -1, _id: 1 } },
    { $lookup: { from: Movie.collection.name, localField: '_id', foreignField: 'id', as: 'movie' } },
    { $unwind: '$movie' }, { $limit: 10 },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$movie', { searchCount: '$count' }] } } },
    { $project: { _id: 0, __v: 0, catalogResearch: 0 } },
  ]);
}
