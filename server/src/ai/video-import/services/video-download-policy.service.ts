import { dirname, isAbsolute } from 'node:path';
import { VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';
import { VideoProbeError, type VideoProbeMetadata } from '../types/video-probe.types.js';
import type { VideoPlatform } from '../types/video-import.types.js';

export function validateProbeMetadata(value: unknown): VideoProbeMetadata {
  const data = value as Record<string, unknown> | null;
  if (!data || data._type === 'playlist' || typeof data.id !== 'string' || !data.id
    || data.duration != null && (typeof data.duration !== 'number' || !Number.isFinite(data.duration) || data.duration <= 0)) throw new VideoProbeError('INVALID_METADATA');
  if (data.is_live || ['is_live', 'is_upcoming', 'post_live'].includes(String(data.live_status))) throw new VideoProbeError('LIVE_VIDEO');
  if (typeof data.duration === 'number' && data.duration > VIDEO_PROBE_LIMITS.maxSeconds) throw new VideoProbeError('VIDEO_TOO_LONG');
  if (data.availability && !['public', 'unlisted'].includes(String(data.availability))) throw new VideoProbeError('PLATFORM_BLOCKED');
  if (typeof data.filesize === 'number' && data.filesize > VIDEO_PROBE_LIMITS.maxBytes) throw new VideoProbeError('VIDEO_TOO_LARGE');
  return { id: data.id, duration: typeof data.duration === 'number' ? data.duration : null,
    ...(typeof data.width === 'number' ? { width: data.width } : {}), ...(typeof data.height === 'number' ? { height: data.height } : {}) };
}
export function videoDownloaderArguments(platform: VideoPlatform, jsPath: string, ffmpegPath: string) {
  return ['--ignore-config', '--no-plugin-dirs', '--no-cache-dir', '--no-playlist', '--no-progress',
    '--no-remote-components', '--no-js-runtimes', '--js-runtimes', `node:${jsPath}`,
    '--use-extractors', `${platform},end`, '--xff', 'never', '--socket-timeout', '15', '--retries', '1', '--fragment-retries', '1',
    ...(isAbsolute(ffmpegPath) ? ['--ffmpeg-location', dirname(ffmpegPath)] : []),
    // Prefer already-compatible public streams over forcing AV1/VP9 -> H.264
    // conversion on a small worker. Fall back to the smallest offered file.
    '-f', 'b[height<=720][ext=mp4][vcodec^=avc1][acodec^=mp4a]/bv*[height<=720][ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080][ext=mp4][vcodec^=avc1][acodec^=mp4a]/b[height<=720][ext=mp4]/bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/worst',
    '--max-filesize', String(VIDEO_PROBE_LIMITS.maxBytes)];
}
