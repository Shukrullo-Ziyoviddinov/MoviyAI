import { videoDownloader } from './video-downloader.service.js';
import { videoImportStorage, videoImportObjectKey, VideoImportStorageError } from './video-import-storage.service.js';
import { validateVideoResult } from '../validators/video-job.validator.js';
import type { VideoImportProcessor, VideoImportResult } from '../types/video-import-job.types.js';

export function createVideoImportProcessor(deps = { downloader: videoDownloader, storage: videoImportStorage }): VideoImportProcessor {
  return async (job, signal, checkpoint) => {
    signal.throwIfAborted();
    if (job.r2Key) {
      await checkpoint({stage:'probing'});
      const saved = validateVideoResult(job, { canonicalUrl: job.canonicalUrl, videoId: job.videoId!, r2Key: job.r2Key, metadata: job.metadata as VideoImportResult['metadata'] });
      const object = await deps.storage.inspect(saved.r2Key, signal);
      if (object) {
        if (object.sizeBytes !== saved.metadata.sizeBytes) throw new VideoImportStorageError('INVALID_R2_OBJECT');
        return saved;
      }
    }
    return deps.downloader.withVideo(job.canonicalUrl, async (video, uploadSignal) => {
      const result = validateVideoResult(job, { canonicalUrl: video.source.canonicalUrl, videoId: video.source.videoId,
        metadata: video.metadata, r2Key: videoImportObjectKey(job.id, video.sha256, video.metadata.mimeType) });
      // Durable reservation precedes PUT. A crash never leaves an untracked key.
      await checkpoint({ ...result, stage: 'uploading' });
      uploadSignal.throwIfAborted();
      await deps.storage.upload(result.r2Key, video.filePath, result.metadata.sizeBytes, uploadSignal);
      const uploaded = await deps.storage.inspect(result.r2Key, uploadSignal);
      if (!uploaded || uploaded.sizeBytes !== result.metadata.sizeBytes) throw new VideoImportStorageError('INVALID_R2_OBJECT');
      return result;
    }, { signal, onProgress: stage => checkpoint({ stage }) });
  };
}
export const videoImportProcessor = createVideoImportProcessor();
