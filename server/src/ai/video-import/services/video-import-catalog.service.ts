import { createCatalogDispatcher, type CatalogOutboxRepository } from '../../catalog/services/catalog-dispatch.service.js';
import { CatalogSaveJob } from '../../catalog/models/catalog-job.model.js';
import { VideoRecognitionModel } from '../models/video-recognition.model.js';
import type { MovieSearchResult } from '../../types/movie-search.types.js';
export function createVideoImportCatalogDispatcher(deps = { results: VideoRecognitionModel, jobs: CatalogSaveJob }) {
const outbox: CatalogOutboxRepository = {
  async pending(_scope, limit) {
    const rows = await deps.results.find({ status: 'completed', catalogDispatch: 'pending' }).sort({ createdAt: 1 }).limit(limit).lean();
    return rows.map(row => ({ id: row._id, conversationId: `video-import:${row._id}`, requestId: 'recognition',
      movie: (row.result as { movie: MovieSearchResult }).movie, portraits: [] }));
  },
  async enqueue(id, input) {
    try { await deps.jobs.updateOne({ _id: id }, { $setOnInsert: { input, status: 'pending', attempts: 0, nextAttemptAt: new Date() } }, { upsert: true }); }
    catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  },
  async markQueued(id) { await deps.results.updateOne({ _id: id, catalogDispatch: 'pending' }, { $set: { catalogDispatch: 'queued' } }); },
};
return createCatalogDispatcher(outbox);
}
export const videoImportCatalogDispatcher = createVideoImportCatalogDispatcher();
