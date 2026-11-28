import { MediaSearch, MediaSearchLease } from './media-search.model.js';
import { deleteChatImage } from '../services/r2.service.js';
import { CatalogSaveJob } from '../ai/catalog/models/catalog-job.model.js';
import { catalogChatInput, isCatalogEligible, catalogJobId } from '../ai/catalog/utils/catalog-chat-input.js';
import { MovieSearchEvent } from '../movie-popularity/models.js';
import { isCountableMovieSearch } from '../movie-popularity/policy.js';
import { prepareCatalogDraft } from '../ai/catalog/mappers/movie.mapper.js';
import { movieMatchInput } from '../ai/catalog/services/catalog-match.service.js';
import type { MovieSearchResult } from '../ai/types/movie-search.types.js';

export async function maintainMediaSearches() {
  for (const row of await MediaSearch.find({ status: 'completed', dispatchPending: true }).limit(20).lean()) {
    try {
      const movie = row.movie as MovieSearchResult;
      if (isCatalogEligible(movie)) await CatalogSaveJob.updateOne({ _id: catalogJobId(`search-${row._id}`, row._id) },
        { $setOnInsert: { input: catalogChatInput(movie, []), status: 'pending', attempts: 0, nextAttemptAt: new Date() } }, { upsert: true });
      if (isCountableMovieSearch(movie)) await MovieSearchEvent.updateOne({ _id: `search:${row._id}` }, { $setOnInsert: {
        identity: movieMatchInput(prepareCatalogDraft(movie, { language: movie.language ?? 'uz' })),
        catalogId: movie.catalogId ?? null, occurredAt: row.completedAt ?? row.updatedAt,
      } }, { upsert: true });
      await MediaSearch.updateOne({ _id: row._id }, { $set: { dispatchPending: false } });
    } catch { console.warn('[MEDIA_SEARCH] Result dispatch will retry'); }
  }
  for (const row of await MediaSearch.find({ expiresAt: { $lte: new Date() }, lockUntil: { $lte: new Date() }, dispatchPending: false }).limit(20).lean()) {
    try { await deleteChatImage(row.key); await MediaSearch.deleteOne({ _id: row._id, lockUntil: { $lte: new Date() } }); }
    catch { console.warn('[MEDIA_SEARCH] Private upload cleanup will retry'); }
  }
  await MediaSearchLease.deleteMany({ until: { $lte: new Date(Date.now() - 3600000) } });
}
export function startMediaSearchMaintenance() {
  let running = false;
  const run = async () => { if (running) return; running = true; try { await maintainMediaSearches(); } catch { console.warn('[MEDIA_SEARCH] Maintenance will retry'); } finally { running = false; } };
  void run(); setInterval(() => { void run(); }, 15000).unref();
}
