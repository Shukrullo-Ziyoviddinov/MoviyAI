import { open, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { runVideoProcess } from './video-process.service.js';
import { videoTools, VIDEO_PROBE_LIMITS } from '../config/video-tools.config.js';
import { VideoProbeError } from '../types/video-probe.types.js';

type Stream = { index?: number; codec_type?: string; codec_name?: string; width?: number; height?: number; disposition?: { attached_pic?: number } };
export type VideoInspection = {
  duration: number; size: number; width: number; height: number; audio: boolean;
  videoCodec: string; audioCodec: string | null; videoIndex: number; mp4: boolean;
};
export function parseVideoInspection(value: unknown, size: number, mp4Header: boolean): VideoInspection {
  const data = value as { format?: { duration?: string; format_name?: string }; streams?: Stream[] } | null;
  if (!size || size < 16) throw new VideoProbeError('INVALID_ARTIFACT');
  if (size > VIDEO_PROBE_LIMITS.maxBytes) throw new VideoProbeError('VIDEO_TOO_LARGE');
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  const video = streams.find(stream => stream?.codec_type === 'video' && stream.disposition?.attached_pic !== 1);
  const audio = streams.find(stream => stream?.codec_type === 'audio');
  const duration = Number(data?.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0 || !video.codec_name || !Number.isInteger(video.index) || video.index! < 0
    || !Number.isInteger(video.width) || !Number.isInteger(video.height) || video.width! <= 0 || video.height! <= 0 || video.width! > 16384 || video.height! > 16384)
    throw new VideoProbeError('INVALID_ARTIFACT');
  if (duration > VIDEO_PROBE_LIMITS.maxSeconds) throw new VideoProbeError('VIDEO_TOO_LONG');
  return { duration, size, width: video.width!, height: video.height!, audio: !!audio, videoCodec: video.codec_name,
    audioCodec: audio?.codec_name ?? null, videoIndex: video.index!, mp4: mp4Header && typeof data?.format?.format_name === 'string' && data.format.format_name.split(',').includes('mp4') };
}
function dimensionsFit(video: VideoInspection) { return Math.min(video.width, video.height) <= 720 && Math.max(video.width, video.height) <= 1280; }
export function videoPreparationArguments(input: string, output: string, video: VideoInspection) {
  const encodeVideo = video.videoCodec !== 'h264' || !dimensionsFit(video);
  const encodeAudio = video.audio && video.audioCodec !== 'aac';
  if (!encodeVideo && !encodeAudio && video.mp4) return null;
  const scale = "scale=w='if(gte(iw,ih),min(1280,iw),min(720,iw))':h='if(gte(iw,ih),min(720,ih),min(1280,ih))':force_original_aspect_ratio=decrease:force_divisible_by=2";
  return ['-nostdin', '-hide_banner', '-loglevel', 'error', '-max_alloc', '67108864', '-threads', '1', '-protocol_whitelist', 'file', '-i', input,
    '-map', `0:${video.videoIndex}`, '-map', '0:a:0?', '-sn', '-dn', '-map_metadata', '-1',
    ...(encodeVideo ? ['-vf', scale, '-filter_threads', '1', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-maxrate', '2500k', '-bufsize', '5000k', '-pix_fmt', 'yuv420p', '-threads', '1'] : ['-c:v', 'copy']),
    ...(encodeAudio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-c:a', 'copy']), '-movflags', '+faststart', '-f', 'mp4', '-y', output];
}

export function createVideoProcessor(deps = { runVideoProcess, videoTools }) {
  async function inspect(file: string, directory: string, signal: AbortSignal) {
    signal.throwIfAborted();
    if (dirname(file) !== directory) throw new VideoProbeError('INVALID_ARTIFACT');
    let info;
    try { info = await lstat(file); } catch { throw new VideoProbeError('INVALID_ARTIFACT'); }
    if (!info.isFile() || info.isSymbolicLink() || info.size < 16) throw new VideoProbeError('INVALID_ARTIFACT');
    if (info.size > VIDEO_PROBE_LIMITS.maxBytes) throw new VideoProbeError('VIDEO_TOO_LARGE');
    const handle = await open(file, 'r'), header = Buffer.alloc(12);
    try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
    const brand = header.toString('ascii', 8, 12);
    const mp4Header = header.toString('ascii', 4, 8) === 'ftyp' && /^(?:iso[m0-9]|mp4[12]|avc1|M4V |dash|MSNV)$/.test(brand);
    const raw = await deps.runVideoProcess(deps.videoTools().ffprobe, ['-v', 'error', '-max_alloc', '67108864', '-protocol_whitelist', 'file',
      '-show_format', '-show_streams', '-of', 'json', '-i', file], { cwd: directory, signal, timeoutMs: 15000 });
    let data: unknown;
    try { data = JSON.parse(raw.stdout); } catch { throw new VideoProbeError('INVALID_ARTIFACT'); }
    return parseVideoInspection(data, info.size, mp4Header);
  }
  return { inspect, async prepare(file: string, directory: string, signal: AbortSignal) {
    const initial = await inspect(file, directory, signal);
    const output = join(directory, 'ready.mp4');
    const args = videoPreparationArguments(file, output, initial);
    if (args) await deps.runVideoProcess(deps.videoTools().ffmpeg, args, { cwd: directory, signal });
    const ready = args ? output : file, final = args ? await inspect(ready, directory, signal) : initial;
    if (!final.mp4 || final.videoCodec !== 'h264' || final.audio && final.audioCodec !== 'aac' || !dimensionsFit(final)) throw new VideoProbeError('INVALID_ARTIFACT');
    // Decode a real frame as well as checking header/metadata. No full video is held in RAM.
    await deps.runVideoProcess(deps.videoTools().ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-max_alloc', '67108864', '-threads', '1',
      '-protocol_whitelist', 'file', '-i', ready, '-map', `0:${final.videoIndex}`, '-frames:v', '1', '-an', '-f', 'null', '-'], { cwd: directory, signal, timeoutMs: 15000 });
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(ready, { signal })) hash.update(chunk);
    signal.throwIfAborted();
    return { filePath: ready, sha256: hash.digest('hex'), converted: !!args,
      metadata: { durationSeconds: final.duration, sizeBytes: final.size, width: final.width, height: final.height, mimeType: 'video/mp4' as const, hasAudio: final.audio } };
  } };
}
export const videoProcessor = createVideoProcessor();
