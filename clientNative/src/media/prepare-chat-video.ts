import { File } from 'expo-file-system';

const MAX_OUTPUT = 14_000_000;
const MAX_INPUT = 80 * 1024 * 1024;
const cache = new Map<string, Promise<File>>();
const failure = (failureCode: string) => Object.assign(new Error(failureCode), { failureCode });
function encoderEdge(width: number, height: number, limit: number): number {
  const major = Math.max(width, height), minor = Math.min(width, height);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || minor < 2) throw failure('video_unreadable');
  if (major <= limit && major % 2 === 0 && minor % 2 === 0) return major;
  // The native manual scaler truncates float dimensions. Choose an edge that
  // also gives an even short side (e.g. avoid a 720 x 405 H.264 encode).
  for (let edge = Math.floor(Math.min(limit, major - 1) / 2) * 2; edge >= 2; edge -= 2) {
    const short = Math.trunc(Math.fround(Math.fround(edge / major) * minor));
    if (short >= 2 && short % 2 === 0) return edge;
  }
  throw failure('compression_failed');
}
function remove(file: File, original: File) {
  if (file.uri !== original.uri) try { if (file.exists) file.delete(); } catch { /* OS cache cleanup remains available. */ }
}

/** Local device encoding only. Neither source nor output is sent to Render. */
export async function prepareChatVideo(original: File): Promise<File> {
  if (!original.exists || original.size <= 0) throw failure('video_unreadable');
  if (original.size > MAX_INPUT) throw failure('video_too_large');
  if (original.size <= MAX_OUTPUT) return original;
  const key = `${original.uri}:${original.size}:${original.modificationTime}`;
  const previous = cache.get(key);
  if (previous) {
    const prepared = await previous;
    if (prepared.exists && prepared.size > 0) return prepared;
    cache.delete(key);
  }
  const pending = compress(original).catch(error => { cache.delete(key); throw error; });
  cache.set(key, pending);
  // Retain a small retry cache, not an ever-growing collection of encoded videos.
  while (cache.size > 3) {
    const oldest = cache.entries().next().value!;
    cache.delete(oldest[0]);
    void oldest[1].then(file => remove(file, original)).catch(() => {});
  }
  return pending;
}

async function compress(original: File): Promise<File> {
  let compressor: typeof import('react-native-compressor');
  try { compressor = await import('react-native-compressor'); }
  catch { throw failure('compression_unsupported'); }
  try {
    const metadata = await compressor.getVideoMetaData(original.uri);
    const duration = metadata.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 180) throw failure('video_unreadable');
    for (let attempt = 0; attempt < 2; attempt++) {
      let cancellationId = '';
      let expired = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const encoding = compressor.Video.compress(original.uri, {
        compressionMethod: 'manual', maxSize: encoderEdge(metadata.width, metadata.height, attempt ? 480 : 720),
        bitrate: Math.max(160_000, Math.min(2_500_000, Math.floor((12_000_000 * 8 / duration - 192_000) * (attempt ? 0.6 : 1)))),
        minimumFileSizeForCompress: 0,
        getCancellationId: id => { cancellationId = id; if (expired) compressor.Video.cancelCompression(id); },
      }).then(uri => {
        const file = new File(uri);
        if (expired) { remove(file, original); throw failure('timeout'); }
        return file;
      });
      let output: File;
      try {
        output = await Promise.race([encoding, new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            try { if (cancellationId) compressor.Video.cancelCompression(cancellationId); } catch { /* Already stopped. */ }
            reject(failure('timeout'));
          }, 300_000);
        })]);
      } finally { if (timer) clearTimeout(timer); }
      if (output.uri === original.uri || !output.exists || output.size <= 0) throw failure('compression_failed');
      try {
        if (output.size > MAX_OUTPUT) continue;
        const checked = await compressor.getVideoMetaData(output.uri);
        if (!Number.isFinite(checked.duration) || Math.abs(checked.duration - duration) > 0.5) throw failure('compression_failed');
        return output;
      } catch (error) { remove(output, original); throw error; }
      finally { if (output.size > MAX_OUTPUT) remove(output, original); }
    }
    throw failure('video_too_large');
  } catch (error) {
    if ((error as { failureCode?: string })?.failureCode) throw error;
    throw failure('compression_failed');
  }
}
