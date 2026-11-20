import type { VideoPlatform } from './video-import.types.js';

export type VideoImportOwner = { kind: 'user' | 'telegram'; id: string };
export type VideoImportStatus = 'queued' | 'processing' | 'retry' | 'completed' | 'failed' | 'cancelled';
export type VideoImportStage = 'queued' | 'url_check' | 'downloading' | 'probing' | 'uploading' | 'ready';
export type VideoImportMetadata = {
  durationSeconds: number | null; sizeBytes: number | null; mimeType: 'video/mp4' | 'video/webm' | null;
  width: number | null; height: number | null; hasAudio: boolean | null;
};
export type VideoImportCheckpoint = {
  stage?: VideoImportStage; canonicalUrl?: string; videoId?: string;
  metadata?: Partial<VideoImportMetadata>; r2Key?: string;
};
export type StoredVideoImportResult = {
  canonicalUrl: string; videoId: string; r2Key: string;
  metadata: { durationSeconds: number; sizeBytes: number; mimeType: 'video/mp4' | 'video/webm'; width: number; height: number; hasAudio: boolean };
};
export type YouTubeImportResult = {
  transport: 'youtube'; canonicalUrl: string; videoId: string; r2Key: null;
  analysisSeconds: number; metadata: VideoImportMetadata;
};
export type VideoImportResult = StoredVideoImportResult | YouTubeImportResult;
export type VideoImportJob = {
  id: string; owner: VideoImportOwner; conversationId: string; requestId: string;
  originalUrl: string; canonicalUrl: string; platform: VideoPlatform; videoId: string | null; fingerprint: string;
  status: VideoImportStatus; stage: VideoImportStage; metadata: VideoImportMetadata; r2Key: string | null;
  transport?: 'r2' | 'youtube'; analysisSeconds?: number | null;
  attempts: number; errorCode: string | null; nextAttemptAt: Date; createdAt: Date;
};
export type ClaimedVideoImportJob = VideoImportJob & { leaseToken: string; slotId: string };
export type NewVideoImportJob = Omit<VideoImportJob, 'status' | 'stage' | 'metadata' | 'r2Key' | 'attempts' | 'errorCode' | 'nextAttemptAt' | 'createdAt'>;
export interface VideoImportJobRepository {
  enqueue(job: NewVideoImportJob): Promise<VideoImportJob>;
  get(owner: VideoImportOwner, id: string): Promise<VideoImportJob | null>;
  cancel(owner: VideoImportOwner, id: string): Promise<boolean>;
  resume(owner: VideoImportOwner, id: string): Promise<boolean>;
  claim(now: Date, token: string, until: Date): Promise<ClaimedVideoImportJob | null>;
  renew(job: ClaimedVideoImportJob, now: Date, until: Date): Promise<boolean>;
  checkpoint(job: ClaimedVideoImportJob, patch: VideoImportCheckpoint, now: Date): Promise<boolean>;
  complete(job: ClaimedVideoImportJob, result: VideoImportResult, now: Date): Promise<boolean>;
  defer(job: ClaimedVideoImportJob, status: 'retry' | 'failed', code: string, next: Date, now: Date): Promise<boolean>;
  release(job: ClaimedVideoImportJob): Promise<void>;
}
export type VideoImportProcessor = (job: ClaimedVideoImportJob, signal: AbortSignal, checkpoint: (patch: VideoImportCheckpoint) => Promise<void>) => Promise<VideoImportResult>;
export class VideoImportJobError extends Error {
  constructor(public readonly code: 'INVALID_JOB' | 'REQUEST_CONFLICT' | 'LEASE_LOST' | 'JOB_TIMEOUT') {
    super(`VIDEO_IMPORT_${code}`); this.name = 'VideoImportJobError';
  }
}
