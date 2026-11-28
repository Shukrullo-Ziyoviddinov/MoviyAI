import { randomUUID } from 'node:crypto';
import { MediaSearch, MediaSearchLease } from './media-search.model.js';
import { searchUpload, validSearchImage } from './media-search.validator.js';
import { chatImageKey, chatVideoKey, signChatImage, inspectChatImage, inspectChatVideo } from '../services/r2.service.js';
import { findMovieFromImages } from '../ai/services/image-movie.service.js';
import { runChatOperation } from '../ai/utils/chat-operation.js';
import { ChatFailure, type ChatProgress } from '../ai/types/chat-progress.types.js';
import { CHAT_VIDEO } from '../ai/config/chat-video.config.js';
import type { MovieSearchResult } from '../ai/types/movie-search.types.js';

const failure = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
export function publicSearchMovie(movie: MovieSearchResult) {
  return { title: movie.title, titleUz: movie.titleUz, titleRu: movie.titleRu, year: movie.year,
    confidence: movie.confidence, sources: [], posters: movie.posters, uzbekLinks: movie.uzbekLinks ?? [] };
}
/** Only server-owned R2 keys reach the shared recognition pipeline. */
export async function identifySearchUpload(row: { kind: string; key: string; size: number; mimeType: string }, language: string, signal: AbortSignal, progress?: ChatProgress,
  deps = { image: inspectChatImage, video: inspectChatVideo, sign: signChatImage, identify: findMovieFromImages }) {
  progress?.(row.kind === 'video' ? 'checking_video' : 'analyzing_image');
  let duration: number | undefined;
  if (row.kind === 'video') {
    const file = await deps.video(row.key);
    if (file.size !== row.size || file.mimeType !== row.mimeType || !Number.isFinite(file.duration) || file.duration <= 0 || file.duration > CHAT_VIDEO.maxSeconds) throw new ChatFailure('video_unreadable');
    duration = file.duration;
  } else {
    const file = await deps.image(row.key);
    if (file.size !== row.size || file.mimeType !== row.mimeType || !validSearchImage(row.mimeType, file.bytes)) throw new ChatFailure('insufficient_evidence');
  }
  signal.throwIfAborted();
  const uri = await deps.sign(row.key, 'GET');
  return deps.identify(`Find the exact movie or series in this media. Respond in ${language}.`,
    [{ mimeType: row.mimeType, fileUri: uri, ...(duration ? { durationSeconds: duration } : {}) }], undefined, signal, 'brief', progress);
}
export async function reserveSearch(userId: string, raw: unknown, sign = signChatImage) {
  const input = searchUpload.parse(raw);
  const key = (input.kind === 'video' ? chatVideoKey(`search-${input.id}`, input.id, input.hash) : chatImageKey(`search-${input.id}`, input.id, 0, input.hash));
  try {
    await MediaSearch.updateOne({ _id: input.id, userId }, { $setOnInsert: {
      userId, kind: input.kind, key, hash: input.hash, size: input.size, mimeType: input.mimeType,
      expiresAt: new Date(Date.now() + 3600000),
    } }, { upsert: true });
  } catch (error) { if ((error as { code?: number }).code === 11000) failure(409, 'Search already exists'); else throw error; }
  const row = await MediaSearch.findOne({ _id: input.id, userId }).lean();
  if (!row || row.expiresAt <= new Date() || row.hash !== input.hash || row.size !== input.size || row.mimeType !== input.mimeType || row.kind !== input.kind)
    return failure(409, 'Search expired or attachment changed');
  if (row.status === 'processing' && row.lockUntil > new Date()) return failure(409, 'Search in progress');
  const seconds = Math.min(300, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000) - 60);
  if (seconds < 1) return failure(410, 'Search expired');
  return { id: input.id, url: await sign(row.key, 'PUT', row.mimeType, row.size, seconds),
    headers: { 'Content-Type': row.mimeType, 'Cache-Control': 'private, no-store' } };
}

export async function analyzeSearch(userId: string, id: string, language: 'uz' | 'ru' | 'en', signal: AbortSignal, progress?: ChatProgress) {
  signal.throwIfAborted();
  const prior = await MediaSearch.findOne({ _id: id, userId, expiresAt: { $gt: new Date() } }).lean();
  if (!prior) return failure(404, 'Search not found');
  if (prior.status === 'completed' && prior.movie) return publicSearchMovie(prior.movie as MovieSearchResult);
  const token = randomUUID(), until = new Date(Date.now() + 240000);
  try {
    await MediaSearchLease.findOneAndUpdate({ _id: userId, until: { $lte: new Date() } }, { $set: { token, until } }, { upsert: true });
  } catch (error) { if ((error as { code?: number }).code === 11000) return failure(429, 'Another media search is in progress'); throw error; }
  try {
    const row = await MediaSearch.findOneAndUpdate({ _id: id, userId, status: { $ne: 'completed' }, expiresAt: { $gt: new Date() }, lockUntil: { $lte: new Date() } },
      { $set: { status: 'processing', token, lockUntil: until } }, { returnDocument: 'after' }).lean();
    if (!row) {
      const completed = await MediaSearch.findOne({ _id: id, userId, status: 'completed', expiresAt: { $gt: new Date() } }).lean();
      if (completed?.movie) return publicSearchMovie(completed.movie as MovieSearchResult);
      return failure(409, 'Search in progress');
    }
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(180000)]);
    return await runChatOperation({ signal: deadline, checkpoints: (row.checkpoints ?? {}) as Record<string, unknown>, save: async (key, value) => {
      const saved = await MediaSearch.updateOne({ _id: id, userId, token }, { $set: { [`checkpoints.${key}`]: value } });
      if (!saved.matchedCount) throw new Error('SEARCH_LEASE_LOST');
    } }, async () => {
      const result = await identifySearchUpload(row, language, deadline, progress);
      if (!result.movie) throw new ChatFailure('identity_unconfirmed');
      deadline.throwIfAborted();
      const completed = await MediaSearch.updateOne({ _id: id, userId, token, status: 'processing' }, { $set: { status: 'completed', movie: result.movie, completedAt: new Date(), dispatchPending: true, lockUntil: new Date(0) } });
      if (!completed.matchedCount) throw new Error('SEARCH_LEASE_LOST');
      return publicSearchMovie(result.movie);
    });
  } catch (error) {
    await MediaSearch.updateOne({ _id: id, userId, token, status: 'processing' }, { $set: { status: 'failed', lockUntil: new Date(0) } });
    throw error;
  } finally { await MediaSearchLease.updateOne({ _id: userId, token }, { $set: { until: new Date(0) } }); }
}
