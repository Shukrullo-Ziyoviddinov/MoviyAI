import { setTimeout as delay } from 'node:timers/promises';
import { extractVideoUrl } from './video-url.service.js';
import { videoImportService } from './video-import.service.js';
import { createVideoImportPipeline } from './video-import-pipeline.service.js';
import { ChatFailure, chatFailureCode, type ChatProgress } from '../../types/chat-progress.types.js';
import type { VideoImportOwner } from '../types/video-import-job.types.js';
import { abortVideoImport } from './video-import-controls.service.js';

// Ordinary source/page links retain their existing chat behavior. Platform links
// (including spoofed hostnames) must pass the exact-host URL policy.
export function hasVideoPlatformLink(text: string) {
  return /https?:\/\/[^\s<>"'`]*(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com)/i.test(text);
}
export function chatVideoUrl(text: string) { return hasVideoPlatformLink(text) ? extractVideoUrl(text) : null; }
const pipeline = createVideoImportPipeline();
export function startVideoImportWorker() { pipeline.start(); }
const defaults = { imports: videoImportService, pipeline, delay };
export function createVideoImportChat(deps = defaults) {
  return async (owner: VideoImportOwner, conversationId: string, requestId: string, text: string, options: {
    signal?: AbortSignal; onProgress?: ChatProgress; onDelta?: (text: string) => void;
    onImport?: (id: string) => Promise<void>; hasMedia?: boolean;
  } = {}) => {
    if (!hasVideoPlatformLink(text)) return null;
    let id: string | undefined;
    const deadline = AbortSignal.timeout(540000), signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    try {
      options.onProgress?.('checking_link');
      const source = chatVideoUrl(text);
      if (!source || options.hasMedia) throw new ChatFailure('video_unreadable');
      signal.throwIfAborted();
      const job = await deps.imports.enqueue(owner, { conversationId, requestId, url: source.originalUrl });
      id = job.id;
      await options.onImport?.(id);
      // Explicitly retrying the same stopped/failed message can reuse its R2 key.
      if (['failed', 'cancelled'].includes(job.status)) await deps.imports.resume(owner, id);
      void deps.pipeline.runOnce().catch(() => {});
      let previous = '';
      for (;;) {
        signal.throwIfAborted();
        const row = await deps.imports.get(owner, id);
        if (!row) throw new ChatFailure('video_unreadable');
        if (row.status === 'completed') break;
        if (row.status === 'failed') throw Object.assign(new Error('VIDEO_IMPORT_FAILED'), { code: row.errorCode ?? 'TOOL_FAILED' });
        if (row.status === 'cancelled') {
          if (!await deps.imports.resume(owner, id)) { await deps.delay(1000, undefined, { signal }); continue; }
          void deps.pipeline.runOnce().catch(() => {});
        }
        const stage = row.status === 'retry' || row.stage === 'queued' ? 'waiting_import' : row.stage === 'url_check' ? 'checking_link'
          : row.stage === 'downloading' ? 'downloading_video' : row.stage === 'probing' ? 'preparing_analysis' : row.stage === 'uploading' ? 'upload_video' : 'preparing_analysis';
        if (stage !== previous) { options.onProgress?.(stage); previous = stage; }
        await deps.delay(1000, undefined, { signal });
      }
      // Recognition capacity is separately bounded across server instances.
      let waitingForAnalysis = false;
      for (;;) try {
        signal.throwIfAborted();
        return await deps.pipeline.recognize(owner, id, { text, signal, onDelta: options.onDelta, onProgress: options.onProgress });
      } catch (error) {
        if ((error as { code?: string })?.code !== 'ANALYSIS_BUSY') throw error;
        if (!waitingForAnalysis) { options.onProgress?.('waiting_analysis'); waitingForAnalysis = true; }
        await deps.delay(1000, undefined, { signal });
      }
    } catch (error) {
      if ((signal.aborted || chatFailureCode(error) === 'stopped') && id) {
        try { await deps.imports.cancel(owner, id); } catch { /* Durable lease bounds recovery. */ }
        abortVideoImport(id, new ChatFailure('stopped'));
      }
      if (signal.aborted) throw new ChatFailure(options.signal?.aborted ? chatFailureCode(options.signal.reason) : 'timeout');
      if (error instanceof ChatFailure) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'PREPARATION_TIMEOUT') throw new ChatFailure('video_prepare_timeout');
      if (['PROCESS_TIMEOUT', 'LINK_TIMEOUT', 'JOB_TIMEOUT'].includes(code ?? '')) throw new ChatFailure('timeout');
      if (['ANALYSIS_LEASE_LOST'].includes(code ?? '')) throw new ChatFailure('stopped');
      if (code) {
        console.warn('[VIDEO_IMPORT]', {event:'request-failed',code:/^[A-Z_]{1,64}$/.test(code)?code:'UNKNOWN'});
        const unreadable = ['PLATFORM_BLOCKED','VIDEO_UNAVAILABLE','INVALID_METADATA','VIDEO_TOO_LONG','VIDEO_TOO_LARGE','LIVE_VIDEO','INVALID_ARTIFACT',
          'IMPORT_NOT_READY','INVALID_URL','UNSAFE_URL','UNSUPPORTED_PLATFORM','UNSUPPORTED_VIDEO_URL','MULTIPLE_VIDEO_URLS','UNSAFE_ADDRESS',
          'REDIRECT_LIMIT','REDIRECT_LOOP','CROSS_PLATFORM_REDIRECT','SHORT_URL_UNRESOLVED','LINK_UNAVAILABLE'];
        throw new ChatFailure(unreadable.includes(code) ? 'video_unreadable' : 'unknown');
      }
      throw error;
    }
  };
}
export const findMovieFromVideoUrl = createVideoImportChat();
