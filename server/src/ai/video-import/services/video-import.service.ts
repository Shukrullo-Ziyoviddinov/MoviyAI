import { createHash } from 'node:crypto';
import { videoImportJobRepository } from '../repositories/video-import-job.repository.js';
import { videoJobInputSchema, videoOwnerSchema } from '../validators/video-job.validator.js';
import { validateVideoUrl } from './video-url.service.js';
import { VideoImportJobError, type VideoImportJobRepository, type VideoImportOwner } from '../types/video-import-job.types.js';

export function createVideoImportService(jobs: VideoImportJobRepository = videoImportJobRepository) {
  function owner(value: VideoImportOwner) {
    const parsed = videoOwnerSchema.safeParse(value);
    if (!parsed.success) throw new VideoImportJobError('INVALID_JOB');
    return parsed.data;
  }
  function jobId(value: string) {
    if (!/^[a-f0-9]{64}$/.test(value)) throw new VideoImportJobError('INVALID_JOB');
    return value;
  }
  return {
    async enqueue(value: VideoImportOwner, input: { conversationId: string; requestId: string; url: string }) {
      const account = owner(value), parsed = videoJobInputSchema.safeParse(input);
      if (!parsed.success) throw new VideoImportJobError('INVALID_JOB');
      const source = validateVideoUrl(parsed.data.url);
      const hash = (parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
      const id = hash(['video-import-v1', account.kind, account.id, parsed.data.conversationId, parsed.data.requestId]);
      return jobs.enqueue({ id, owner: account, conversationId: parsed.data.conversationId, requestId: parsed.data.requestId,
        originalUrl: source.originalUrl, canonicalUrl: source.canonicalUrl, platform: source.platform, videoId: source.videoId,
        fingerprint: hash([source.platform, source.videoId ?? source.canonicalUrl]) });
    },
    async get(value: VideoImportOwner, id: string) { return jobs.get(owner(value), jobId(id)); },
    async cancel(value: VideoImportOwner, id: string) { return jobs.cancel(owner(value), jobId(id)); },
    async resume(value: VideoImportOwner, id: string) { return jobs.resume(owner(value), jobId(id)); },
  };
}
export const videoImportService = createVideoImportService();
