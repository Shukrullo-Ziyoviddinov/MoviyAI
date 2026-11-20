import { CHAT_VIDEO } from '../../config/chat-video.config.js';
import { validatePreparedVideoResult } from '../validators/video-job.validator.js';
import type { ClaimedVideoImportJob, YouTubeImportResult } from '../types/video-import-job.types.js';

/** Official Gemini YouTube input. The URL is canonical and exact-host checked;
 * no downloader, redirects, cookies, local media files or R2 upload are used. */
export function prepareYouTubeSource(job: ClaimedVideoImportJob): YouTubeImportResult {
  return validatePreparedVideoResult(job, {
    transport: 'youtube', canonicalUrl: job.canonicalUrl, videoId: job.videoId!, r2Key: null,
    analysisSeconds: CHAT_VIDEO.maxSeconds,
    metadata: { durationSeconds: null, sizeBytes: null, mimeType: null, width: null, height: null, hasAudio: null },
  }) as YouTubeImportResult;
}
