import { createHash, randomUUID } from 'node:crypto';
import { videoImportService } from './video-import.service.js';
import { videoImportStorage } from './video-import-storage.service.js';
import { videoRecognitionRepository } from '../repositories/video-recognition.repository.js';
import { findMovieFromVideo } from '../../services/video-movie.service.js';
import { runChatOperation, withoutChatOperation } from '../../utils/chat-operation.js';
import { validateVideoResult, validatePreparedVideoResult } from '../validators/video-job.validator.js';
import { wakeCatalogWorker } from '../../catalog/services/catalog-worker.service.js';
import { VideoRecognitionError } from '../types/video-recognition.types.js';
import { registerVideoImport } from './video-import-controls.service.js';
import type { VideoImportOwner, ClaimedVideoImportJob } from '../types/video-import-job.types.js';
import type { ChatProgress } from '../../types/chat-progress.types.js';
import type { ChatImageUrl } from '../../types/movie-search.types.js';

const defaults = { imports: videoImportService, storage: videoImportStorage, results: videoRecognitionRepository, findMovie: findMovieFromVideo, notifyCatalog: wakeCatalogWorker };
export function createVideoImportRecognition(deps = defaults) {
  const notify = () => { try { withoutChatOperation(() => deps.notifyCatalog()); } catch { console.warn('[VIDEO_IMPORT]', { event: 'catalog-notify-deferred' }); } };
  return async (owner: VideoImportOwner, id: string, options: { text?: string; signal?: AbortSignal; onDelta?: (text: string) => void; onProgress?: ChatProgress } = {}) => {
    const controller = new AbortController(), deadline = AbortSignal.timeout(180000);
    const signal = AbortSignal.any([controller.signal, deadline, ...(options.signal ? [options.signal] : [])]);
    signal.throwIfAborted();
    const job = await deps.imports.get(owner, id);
    if (!job || job.status !== 'completed' || (!job.r2Key && job.transport !== 'youtube') || !job.videoId) throw new VideoRecognitionError('IMPORT_NOT_READY');
    const text = options.text?.trim() || 'Ushbu videodagi kinoni toping.';
    if (text.length > 20000) throw new VideoRecognitionError('ANALYSIS_CONFLICT');
    const fingerprint = createHash('sha256').update(JSON.stringify(job.transport === 'youtube'
      ? [job.id, 'youtube-v1', job.canonicalUrl, job.analysisSeconds, text] : [job.id, job.r2Key, text])).digest('hex');
    const saved = await deps.results.get(job.id);
    if (saved && saved.fingerprint !== fingerprint) throw new VideoRecognitionError('ANALYSIS_CONFLICT');
    if (saved?.result) { signal.throwIfAborted(); notify(); return saved.result; }
    const token = randomUUID();
    const checkpoints = await deps.results.claim(job.id, fingerprint, token, new Date(Date.now() + 210000));
    if (!checkpoints) throw new VideoRecognitionError('ANALYSIS_BUSY');
    const unregister = registerVideoImport(job.id, controller);
    let checking: Promise<void> | undefined;
    const watcher = setInterval(() => {
      if (checking || signal.aborted) return;
      checking = deps.results.alive(job.id, token).then(ok => { if (!ok) controller.abort(new VideoRecognitionError('ANALYSIS_LEASE_LOST')); })
        .catch(() => controller.abort(new VideoRecognitionError('ANALYSIS_LEASE_LOST'))).finally(() => { checking = undefined; });
    }, 1000); watcher.unref();
    try {
      options.onProgress?.('checking_video');
      let input: ChatImageUrl;
      if (job.transport === 'youtube') {
        const source = validatePreparedVideoResult(job as ClaimedVideoImportJob, { transport: 'youtube', canonicalUrl: job.canonicalUrl,
          videoId: job.videoId, r2Key: null, metadata: job.metadata, analysisSeconds: job.analysisSeconds! });
        if (!('transport' in source)) throw new VideoRecognitionError('IMPORT_NOT_READY');
        if (job.r2Key) throw new VideoRecognitionError('IMPORT_NOT_READY');
        input = { mimeType: 'video/mp4', fileUri: source.canonicalUrl, analysisSeconds: source.analysisSeconds };
      } else {
        const media = validateVideoResult(job as ClaimedVideoImportJob, { canonicalUrl: job.canonicalUrl, videoId: job.videoId, r2Key: job.r2Key!, metadata: job.metadata as Parameters<typeof validateVideoResult>[1]['metadata'] });
        const object = await deps.storage.inspect(media.r2Key, signal);
        if (!object || object.sizeBytes !== media.metadata.sizeBytes) throw new VideoRecognitionError('IMPORT_NOT_READY');
        const fileUri = await deps.storage.signForAnalysis(media.r2Key, signal);
        input = { mimeType: media.metadata.mimeType, fileUri, durationSeconds: media.metadata.durationSeconds };
      }
      const result = await runChatOperation({ signal, checkpoints, save: async (key, value) => {
        if (!await deps.results.checkpoint(job.id, token, key, value)) throw new VideoRecognitionError('ANALYSIS_LEASE_LOST');
      } }, () => deps.findMovie(text, [input], options.onDelta, options.onProgress));
      signal.throwIfAborted();
      if (!await deps.results.complete(job.id, token, result)) throw new VideoRecognitionError('ANALYSIS_LEASE_LOST');
      // The result and catalog outbox flag are committed together, independently
      // of later enrichment failures. Signed media URLs never enter that outbox.
      notify();
      return result;
    } catch (error) {
      // Provider wrappers may replace an abort with a generic service error.
      // Preserve the real stop/deletion/timeout reason from this operation.
      signal.throwIfAborted();
      throw error;
    } finally {
      clearInterval(watcher); await checking; unregister();
      try { await deps.results.release(job.id, token); }
      catch { console.warn('[VIDEO_IMPORT]', { event: 'analysis-release-deferred' }); }
    }
  };
}
export const recognizeImportedVideo = createVideoImportRecognition();
