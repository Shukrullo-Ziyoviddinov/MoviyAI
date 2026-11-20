import { z } from 'zod';
import { CHAT_VIDEO } from '../../config/chat-video.config.js';
import { validateVideoUrl } from '../services/video-url.service.js';
import { VideoImportJobError, type ClaimedVideoImportJob, type VideoImportCheckpoint, type VideoImportResult, type StoredVideoImportResult } from '../types/video-import-job.types.js';

const id = z.string().min(1).max(128).regex(/^[a-zA-Z0-9:_-]+$/);
export const videoOwnerSchema = z.object({ kind: z.enum(['user', 'telegram']), id }).strict();
export const videoJobInputSchema = z.object({ conversationId: id, requestId: id, url: z.string().max(2048) }).strict();
const fields = {
  durationSeconds: z.number().positive().max(CHAT_VIDEO.maxSeconds),
  sizeBytes: z.number().int().min(16).max(CHAT_VIDEO.maxBytes), mimeType: z.enum(['video/mp4', 'video/webm']),
  width: z.number().int().positive().max(16384), height: z.number().int().positive().max(16384), hasAudio: z.boolean(),
};
const finalMetadata = z.object(fields).strict();
const partialMetadata = z.object({ durationSeconds: fields.durationSeconds.nullable(), sizeBytes: fields.sizeBytes.nullable(), mimeType: fields.mimeType.nullable(),
  width: fields.width.nullable(), height: fields.height.nullable(), hasAudio: fields.hasAudio.nullable() }).partial().strict();
const patchSchema = z.object({ stage: z.enum(['url_check', 'downloading', 'probing', 'uploading']), canonicalUrl: z.string().max(2048).optional(),
  videoId: id.optional(), metadata: partialMetadata.optional(), r2Key: z.string().min(1).max(1024).optional() }).partial().strict()
  .refine(patch => Object.entries(patch).some(([key, value]) => key !== 'metadata' || value && Object.keys(value).length > 0));
const resultSchema = z.object({ canonicalUrl: z.string().max(2048), videoId: id, metadata: finalMetadata, r2Key: z.string().min(1).max(1024) }).strict();

function identity(job: ClaimedVideoImportJob, patch: { canonicalUrl?: string; videoId?: string; r2Key?: string }) {
  const source = validateVideoUrl(patch.canonicalUrl ?? job.canonicalUrl);
  const videoId = patch.videoId ?? job.videoId;
  if (source.platform !== job.platform || videoId && (source.needsResolution || source.videoId !== videoId) || job.videoId && videoId !== job.videoId)
    throw new VideoImportJobError('INVALID_JOB');
  const prefix = `videoimport/${job.id}/`;
  if (patch.r2Key && (!patch.r2Key.startsWith(prefix) || !/^[a-f0-9]{64}\.(?:mp4|webm)$/.test(patch.r2Key.slice(prefix.length)))) throw new VideoImportJobError('INVALID_JOB');
  return source;
}
export function validateVideoCheckpoint(job: ClaimedVideoImportJob, patch: VideoImportCheckpoint): VideoImportCheckpoint {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) throw new VideoImportJobError('INVALID_JOB');
  const source = identity(job, parsed.data);
  return { ...parsed.data, ...(parsed.data.canonicalUrl ? { canonicalUrl: source.canonicalUrl } : {}) };
}
export function validateVideoResult(job: ClaimedVideoImportJob, result: StoredVideoImportResult): StoredVideoImportResult {
  const parsed = resultSchema.safeParse(result);
  if (!parsed.success) throw new VideoImportJobError('INVALID_JOB');
  const source = identity(job, parsed.data);
  if (source.needsResolution) throw new VideoImportJobError('INVALID_JOB');
  if (!parsed.data.r2Key.endsWith(parsed.data.metadata.mimeType === 'video/webm' ? '.webm' : '.mp4')) throw new VideoImportJobError('INVALID_JOB');
  return { ...parsed.data, canonicalUrl: source.canonicalUrl };
}

const youtubeResultSchema = z.object({ transport: z.literal('youtube'), canonicalUrl: z.string().max(2048), videoId: id,
  r2Key: z.null(), analysisSeconds: z.number().int().positive().max(CHAT_VIDEO.maxSeconds),
  metadata: z.object({ durationSeconds: z.null(), sizeBytes: z.null(), mimeType: z.null(), width: z.null(), height: z.null(), hasAudio: z.null() }).strict(),
}).strict();
export function validatePreparedVideoResult(job: ClaimedVideoImportJob, result: VideoImportResult): VideoImportResult {
  if ('transport' in result && result.transport === 'youtube') {
    const parsed = youtubeResultSchema.safeParse(result);
    if (!parsed.success) throw new VideoImportJobError('INVALID_JOB');
    const source = identity(job, { canonicalUrl: parsed.data.canonicalUrl, videoId: parsed.data.videoId });
    if (source.platform !== 'youtube' || source.needsResolution) throw new VideoImportJobError('INVALID_JOB');
    return { ...parsed.data, canonicalUrl: source.canonicalUrl };
  }
  return validateVideoResult(job, result as StoredVideoImportResult);
}
