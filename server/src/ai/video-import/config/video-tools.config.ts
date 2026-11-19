import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAT_VIDEO } from '../../config/chat-video.config.js';

export const VIDEO_IMPORT_SERVER_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
export function videoTools() {
  const ffmpeg = process.env.VIDEO_FFMPEG_PATH || 'ffmpeg';
  return {
    ytdlp: process.env.VIDEO_YTDLP_PATH || join(VIDEO_IMPORT_SERVER_ROOT, '.tools', 'video-import', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
    ffmpeg,
    ffprobe: process.env.VIDEO_FFPROBE_PATH || (ffmpeg === 'ffmpeg' ? 'ffprobe' : join(dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')),
    js: process.env.VIDEO_JS_RUNTIME_PATH || process.execPath,
  };
}
export const VIDEO_PROBE_LIMITS = {
  maxBytes: CHAT_VIDEO.maxBytes,
  maxWorkBytes: 160 * 1024 * 1024,
  maxSeconds: CHAT_VIDEO.maxSeconds,
  timeoutMs: 180000,
  metadataMs: 45000,
  maxOutputBytes: 2 * 1024 * 1024,
} as const;
