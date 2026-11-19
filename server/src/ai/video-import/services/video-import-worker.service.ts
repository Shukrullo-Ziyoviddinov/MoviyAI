import { randomUUID } from 'node:crypto';
import { VIDEO_IMPORT_QUEUE } from '../config/video-import.config.js';
import { videoImportJobRepository } from '../repositories/video-import-job.repository.js';
import { validateVideoCheckpoint, validateVideoResult } from '../validators/video-job.validator.js';
import { registerVideoImport } from './video-import-controls.service.js';
import { VideoImportJobError, type ClaimedVideoImportJob, type VideoImportJobRepository, type VideoImportProcessor } from '../types/video-import-job.types.js';

function failure(error: unknown) {
  const code = (error as { code?: unknown; name?: string })?.code;
  const known = new Set(['NETWORK_ERROR', 'DNS_FAILED', 'LINK_TIMEOUT', 'PROCESS_TIMEOUT', 'PLATFORM_BLOCKED', 'VIDEO_UNAVAILABLE',
    'INVALID_METADATA', 'VIDEO_TOO_LONG', 'VIDEO_TOO_LARGE', 'LIVE_VIDEO', 'INVALID_ARTIFACT', 'TOOL_MISSING', 'TOOL_FAILED',
    'JS_RUNTIME_UNSUPPORTED', 'PREPARATION_TIMEOUT', 'UNSAFE_URL', 'UNSAFE_ADDRESS', 'UNSUPPORTED_PLATFORM', 'UNSUPPORTED_VIDEO_URL', 'INVALID_URL',
    'REDIRECT_LIMIT', 'REDIRECT_LOOP', 'CROSS_PLATFORM_REDIRECT', 'SHORT_URL_UNRESOLVED', 'LINK_UNAVAILABLE', 'INVALID_JOB', 'JOB_TIMEOUT', 'PROCESS_OUTPUT_LIMIT', 'R2_UNAVAILABLE', 'INVALID_R2_OBJECT']);
  const safe = typeof code === 'string' && known.has(code) ? code : (error as { name?: string })?.name === 'TimeoutError' ? 'JOB_TIMEOUT' : 'WORKER_FAILED';
  return { code: safe, retry: ['NETWORK_ERROR', 'DNS_FAILED', 'LINK_TIMEOUT', 'PROCESS_TIMEOUT', 'JOB_TIMEOUT', 'WORKER_FAILED', 'R2_UNAVAILABLE'].includes(safe) };
}

/** A processor is mandatory. No downloader/no-op handler is started implicitly. */
export function createVideoImportWorker(options: { process: VideoImportProcessor; jobs?: VideoImportJobRepository; now?: () => Date }) {
  if (typeof options.process !== 'function') throw new VideoImportJobError('INVALID_JOB');
  const jobs = options.jobs ?? videoImportJobRepository, now = options.now ?? (() => new Date());
  const controllers = new Map<string, AbortController>();
  let active = 0, stopped = false, timer: ReturnType<typeof setInterval> | undefined;
  async function one() {
    let job: ClaimedVideoImportJob | null = null;
    try {
      const started = now();
      job = await jobs.claim(started, randomUUID(), new Date(started.getTime() + VIDEO_IMPORT_QUEUE.leaseMs));
      if (!job) return;
      const claimed = job, controller = new AbortController();
      controllers.set(claimed.id, controller);
      const unregister = registerVideoImport(claimed.id, controller);
      let renewing: Promise<void> | undefined;
      const deadline = setTimeout(() => controller.abort(new VideoImportJobError('JOB_TIMEOUT')), VIDEO_IMPORT_QUEUE.jobTimeoutMs);
      deadline.unref();
      const heartbeat = setInterval(() => {
        if (renewing || controller.signal.aborted) return;
        const time = now();
        renewing = jobs.renew(claimed, time, new Date(time.getTime() + VIDEO_IMPORT_QUEUE.leaseMs)).then(ok => {
          if (!ok) controller.abort(new VideoImportJobError('LEASE_LOST'));
        }).catch(() => controller.abort(new VideoImportJobError('LEASE_LOST'))).finally(() => { renewing = undefined; });
      }, VIDEO_IMPORT_QUEUE.heartbeatMs); heartbeat.unref();
      try {
        if (stopped) controller.abort(new VideoImportJobError('LEASE_LOST'));
        controller.signal.throwIfAborted();
        const result = await options.process(claimed, controller.signal, async patch => {
          controller.signal.throwIfAborted();
          const valid = validateVideoCheckpoint(claimed, patch);
          if (!await jobs.checkpoint(claimed, valid, now())) { controller.abort(new VideoImportJobError('LEASE_LOST')); throw controller.signal.reason; }
          const metadata = valid.metadata ? { ...claimed.metadata, ...valid.metadata } : claimed.metadata;
          Object.assign(claimed, valid, { metadata });
        });
        controller.signal.throwIfAborted();
        const valid = validateVideoResult(claimed, result);
        if (!await jobs.complete(claimed, valid, now())) throw new VideoImportJobError('LEASE_LOST');
      } catch (error) {
        const cause = controller.signal.aborted ? controller.signal.reason : error;
        if (!(cause instanceof VideoImportJobError && cause.code === 'LEASE_LOST') && (cause as {failureCode?:string})?.failureCode !== 'stopped') {
          const info = failure(cause);
          const status = info.retry && claimed.attempts < VIDEO_IMPORT_QUEUE.maxAttempts ? 'retry' : 'failed';
          const delay = VIDEO_IMPORT_QUEUE.retryMs[Math.min(Math.max(0, claimed.attempts - 1), VIDEO_IMPORT_QUEUE.retryMs.length - 1)];
          await jobs.defer(claimed, status, info.code, new Date(now().getTime() + delay), now());
          console.warn('[VIDEO_IMPORT]', { event: status, jobId: claimed.id, stage: claimed.stage, elapsedMs: Math.max(0,now().getTime()-started.getTime()), code: info.code, attempt: claimed.attempts });
        }
      } finally {
        clearTimeout(deadline); clearInterval(heartbeat);
        await renewing;
        if (controllers.get(claimed.id) === controller) controllers.delete(claimed.id);
        unregister();
      }
    } catch { console.warn('[VIDEO_IMPORT]', { event: 'queue-deferred' }); }
    finally {
      if (job) try { await jobs.release(job); } catch { /* The durable slot expires if the DB is temporarily unavailable. */ }
    }
  }
  async function runOnce() {
    if (stopped) return;
    const tasks: Promise<void>[] = [];
    while (active < VIDEO_IMPORT_QUEUE.parallel) {
      active++; tasks.push(one().finally(() => { active--; }));
    }
    await Promise.all(tasks);
  }
  return {
    runOnce,
    start() { if (timer || stopped) return; timer = setInterval(() => { void runOnce(); }, VIDEO_IMPORT_QUEUE.pollMs); timer.unref(); void runOnce(); },
    stop() {
      stopped = true; clearInterval(timer); timer = undefined;
      for (const controller of controllers.values()) controller.abort(new VideoImportJobError('LEASE_LOST'));
    },
  };
}
