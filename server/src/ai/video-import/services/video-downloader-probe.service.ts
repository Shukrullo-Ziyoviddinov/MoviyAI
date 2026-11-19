import { createVideoDownloader } from './video-downloader.service.js';
import { isAbsolute, dirname, join } from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { VIDEO_IMPORT_SERVER_ROOT, videoTools } from '../config/video-tools.config.js';
import { runVideoProcess } from './video-process.service.js';
import { VideoProbeError } from '../types/video-probe.types.js';

const PROBE_ROOT = join(VIDEO_IMPORT_SERVER_ROOT, '.qa-video-import');
async function workspace(prefix: 'check-' | 'probe-') {
  await mkdir(PROBE_ROOT, { recursive: true });
  return mkdtemp(join(PROBE_ROOT, prefix));
}
async function cleanup(directory: string) {
  // Only absolute mkdtemp children of this fixed private root may be removed.
  if (!isAbsolute(directory) || dirname(directory) !== PROBE_ROOT) throw new VideoProbeError('INVALID_ARTIFACT');
  await rm(directory, { recursive: true, force: true });
}

export { validateProbeMetadata, videoDownloaderArguments } from './video-download-policy.service.js';

export async function checkVideoTools() {
  const tools = videoTools();
  const versions: Record<string, string> = {};
  const directory = await workspace('check-');
  try {
  for (const [name, executable] of Object.entries(tools)) {
    try {
    const result = await runVideoProcess(executable, name === 'ffmpeg' || name === 'ffprobe' ? ['-version'] : ['--version'], { cwd: directory, timeoutMs: 15000 });
    versions[name] = result.stdout.trim().split(/\r?\n/)[0].trim().slice(0, 150);
    } catch (error) { throw new VideoProbeError(error instanceof VideoProbeError ? error.code : 'TOOL_FAILED', name); }
  }
  if (Number(versions.js.replace(/^v/, '').split('.')[0]) < 22) throw new VideoProbeError('JS_RUNTIME_UNSUPPORTED', 'js');
  return versions;
  } finally { await cleanup(directory); }
}

/** Operator-only adapter over the shared downloader. */
export function createVideoDownloaderProbe(deps?: Parameters<typeof createVideoDownloader>[0]) {
 const downloader = createVideoDownloader(deps);
 return async (value: string, options: { metadataOnly?: boolean; signal?: AbortSignal } = {}) => {
  if (options.metadataOnly) {
   const result = await downloader.inspectSource(value, options);
   return { platform: result.source.platform, videoId: result.source.videoId, status: 'metadata-only' as const, metadata: result.metadata };
  }
  return downloader.withVideo(value, async video => ({ platform: video.source.platform, videoId: video.source.videoId,
   status: 'downloaded-and-probed' as const, bytes: video.metadata.sizeBytes, duration: video.metadata.durationSeconds,
   width: video.metadata.width, height: video.metadata.height, audio: video.metadata.hasAudio }), options);
 };
}
export const probeVideoDownload = createVideoDownloaderProbe();
