import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveVideoUrl } from './video-url-resolution.service.js';
import { runVideoProcess } from './video-process.service.js';
import { createVideoWorkspace } from './video-workspace.service.js';
import { createVideoEgress } from './video-egress.service.js';
import { videoProcessor } from './video-processor.service.js';
import { validateProbeMetadata, videoDownloaderArguments } from './video-download-policy.service.js';
import { videoTools, VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';
import { VideoProbeError } from '../types/video-probe.types.js';
import type { DownloadOptions, DownloadedVideo } from '../types/video-download.types.js';

const defaults = { resolveVideoUrl, runVideoProcess, createVideoWorkspace, createVideoEgress, videoProcessor, videoTools };
/** Owns the artifact until the consumer finishes (for example, a later R2 upload).
 * Nothing in this module sends a video to chat or starts movie recognition. */
export function createVideoDownloader(deps = defaults) {
  async function execute<T>(value: string, options: DownloadOptions, consumer?: (video: DownloadedVideo, signal: AbortSignal) => Promise<T>) {
    const budget = new AbortController();
    const timer = setTimeout(() => budget.abort(new VideoProbeError('PROCESS_TIMEOUT')), 240000); timer.unref();
    const signal = options.signal ? AbortSignal.any([options.signal, budget.signal]) : budget.signal;
    let workspace: Awaited<ReturnType<typeof createVideoWorkspace>>;
    try { workspace = await deps.createVideoWorkspace(); } catch (error) { clearTimeout(timer); throw error; }
    let egress: Awaited<ReturnType<typeof createVideoEgress>> | undefined;
    let watch: ReturnType<typeof setInterval> | undefined;
    let checking: Promise<void> | undefined;
    try {
      await options.onProgress?.('url_check');
      const source = await deps.resolveVideoUrl(value, { signal });
      egress = await deps.createVideoEgress(signal);
      const downloadDeadline = new AbortController();
      const downloadTimer = setTimeout(() => downloadDeadline.abort(new VideoProbeError('PROCESS_TIMEOUT')), VIDEO_PROBE_LIMITS.timeoutMs); downloadTimer.unref();
      try {
        const childSignal = AbortSignal.any([egress.signal, downloadDeadline.signal]);
        const tools = deps.videoTools();
        const base = [...videoDownloaderArguments(source.platform, tools.js, tools.ffmpeg), '--proxy', egress.url];
        const raw = await deps.runVideoProcess(tools.ytdlp, [...base, '--dump-single-json', '--skip-download', '--', source.canonicalUrl], {
          cwd: workspace.directory, signal: childSignal, timeoutMs: VIDEO_PROBE_LIMITS.metadataMs,
        });
        let data: unknown;
        try { data = JSON.parse(raw.stdout); } catch { throw new VideoProbeError('INVALID_METADATA'); }
        const metadata = validateProbeMetadata(data);
        if (source.platform !== 'instagram' && metadata.id !== source.videoId) throw new VideoProbeError('INVALID_METADATA');
        if (!consumer) return { source, metadata };
        watch = setInterval(() => {
          if (checking) return;
          checking = workspace.checkBudget().catch(error => budget.abort(error)).finally(() => { checking = undefined; });
        }, 250); watch.unref();
        await options.onProgress?.('downloading');
        await deps.runVideoProcess(tools.ytdlp, [...base, '--downloader', 'native', '--merge-output-format', 'mp4',
          '-o', join(workspace.directory, 'source.%(ext)s'), '--', source.canonicalUrl], { cwd: workspace.directory, signal: childSignal });
        await workspace.checkBudget();
        const files = (await readdir(workspace.directory)).filter(name => /^source\.(mp4|webm|mkv|mov|m4v)$/.test(name));
        if (files.length !== 1) throw new VideoProbeError('INVALID_ARTIFACT');
        await options.onProgress?.('probing');
        const prepared = await deps.videoProcessor.prepare(join(workspace.directory, files[0]), workspace.directory, childSignal);
        childSignal.throwIfAborted();
        clearTimeout(downloadTimer);
        return await consumer({ source, ...prepared }, egress.signal);
      } finally { clearTimeout(downloadTimer); }
    } finally {
      clearTimeout(timer); clearInterval(watch);
      await checking;
      try { await egress?.close(); } finally { await workspace.cleanup(); }
    }
  }
  return {
    inspectSource: (value: string, options: DownloadOptions = {}) => execute(value, options) as Promise<{source: Awaited<ReturnType<typeof resolveVideoUrl>>; metadata: ReturnType<typeof validateProbeMetadata>}>,
    withVideo: <T>(value: string, consumer: (video: DownloadedVideo, signal: AbortSignal) => Promise<T>, options: DownloadOptions = {}) => execute(value, options, consumer) as Promise<T>,
  };
}
export const videoDownloader = createVideoDownloader();
