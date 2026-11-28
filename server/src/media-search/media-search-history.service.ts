import { MediaSearch, MediaSearchDeletion } from './media-search.model.js';
import { signChatImage } from '../services/r2.service.js';
import { publicSearchMovie } from './media-search.service.js';
import { finishSearchDeletion } from './media-search.maintenance.js';
import type { MovieSearchResult } from '../ai/types/movie-search.types.js';
import { searchId } from './media-search.validator.js';

export function historyCursor(raw: unknown): { createdAt: Date; id: string } | null {
  if (raw === undefined) return null;
  try {
    if (typeof raw !== 'string' || !/^[\w-]{1,512}$/.test(raw)) throw Error();
    const item = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!searchId.safeParse(item.id).success || typeof item.at !== 'string' || !Number.isFinite(Date.parse(item.at))) throw Error();
    return { id: item.id, createdAt: new Date(item.at) };
  } catch { throw Object.assign(new Error('Invalid history cursor'), { status: 400 }); }
}
export async function listSearchHistory(userId: string, cursor?: unknown) {
  const after = historyCursor(cursor);
  const rows = await MediaSearch.find({ userId, status: 'completed', deletedAt: null,
    ...(after ? { $or: [{ createdAt: { $lt: after.createdAt } }, { createdAt: after.createdAt, _id: { $lt: after.id } }] } : {}),
  }).select('_id kind movie.title movie.titleUz movie.titleRu movie.posters createdAt').sort({ createdAt: -1, _id: -1 }).limit(21).lean();
  const page = rows.slice(0, 20), last = page.at(-1);
  return { items: page.map(row => ({ id: row._id, kind: row.kind, title: row.movie?.title ?? '', titleUz: row.movie?.titleUz ?? null,
    titleRu: row.movie?.titleRu ?? null, poster: row.movie?.posters?.[0]?.url ?? null, createdAt: row.createdAt })),
    nextCursor: rows.length > 20 && last ? Buffer.from(JSON.stringify({ id: last._id, at: last.createdAt.toISOString() })).toString('base64url') : null };
}
export async function readSearchHistory(userId: string, id: string, sign = signChatImage) {
  const row = await MediaSearch.findOne({ _id: id, userId, status: 'completed', deletedAt: null }).lean();
  if (!row?.movie) throw Object.assign(new Error('Search not found'), { status: 404 });
  return { id, movie: publicSearchMovie(row.movie as MovieSearchResult), media: { kind: row.kind, url: await sign(row.key, 'GET') } };
}
export async function deleteSearchHistory(userId: string, id: string, finish = finishSearchDeletion) {
  const row = await MediaSearch.findOneAndUpdate({ _id: id, userId, status: 'completed' }, { $set: { deletedAt: new Date() } }, { returnDocument: 'after' }).lean();
  if (!row) return { id, pending: false };
  await MediaSearchDeletion.updateOne({ _id: id }, { $setOnInsert: { key: row.key, until: row.expiresAt, nextAttemptAt: new Date() } }, { upsert: true });
  try { await finish(id); return { id, pending: false }; }
  catch { return { id, pending: true }; }
}
