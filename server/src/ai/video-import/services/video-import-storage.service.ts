import { open } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from '../../../services/r2.service.js';
import { env } from '../../../config/env.js';
import { CHAT_VIDEO } from '../../config/chat-video.config.js';

export class VideoImportStorageError extends Error {
  constructor(public readonly code: 'R2_UNAVAILABLE' | 'INVALID_R2_OBJECT') { super(code); this.name = 'VideoImportStorageError'; }
}
export function videoImportObjectKey(jobId: string, sha256: string, mimeType: 'video/mp4' | 'video/webm' = 'video/mp4') {
  if (!/^[a-f0-9]{64}$/.test(jobId) || !/^[a-f0-9]{64}$/.test(sha256)) throw new VideoImportStorageError('INVALID_R2_OBJECT');
  return `videoimport/${jobId}/${sha256}.${mimeType === 'video/webm' ? 'webm' : 'mp4'}`;
}
function validateKey(key: string) {
  if (!/^videoimport\/[a-f0-9]{64}\/[a-f0-9]{64}\.(?:mp4|webm)$/.test(key)) throw new VideoImportStorageError('INVALID_R2_OBJECT');
  return key.slice(key.lastIndexOf('/') + 1, key.lastIndexOf('.'));
}
const defaults = { client: getR2Client, bucket: () => env.r2Bucket };
export function createVideoImportStorage(deps = defaults) {
  function input(key: string) {
    validateKey(key);
    const Bucket = deps.bucket();
    if (!Bucket) throw new VideoImportStorageError('R2_UNAVAILABLE');
    return { Bucket, Key: key };
  }
  async function send(command: PutObjectCommand | HeadObjectCommand | DeleteObjectCommand, signal: AbortSignal) {
    signal.throwIfAborted();
    try { return await deps.client().send(command, { abortSignal: signal }); }
    catch (error) {
      signal.throwIfAborted();
      const named = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (command instanceof HeadObjectCommand && (named.$metadata?.httpStatusCode === 404 || ['NoSuchKey', 'NotFound'].includes(named.name ?? ''))) return null;
      throw new VideoImportStorageError('R2_UNAVAILABLE');
    }
  }
  return {
    async signForAnalysis(key: string, signal: AbortSignal) {
      signal.throwIfAborted();
      const url = await getSignedUrl(deps.client(), new GetObjectCommand(input(key)), { expiresIn: 900 });
      signal.throwIfAborted();
      return url;
    },
    async inspect(key: string, signal: AbortSignal) {
      const hash = validateKey(key);
      const meta = await send(new HeadObjectCommand(input(key)), AbortSignal.any([signal, AbortSignal.timeout(10000)]));
      if (!meta) return null;
      const head = meta as { ContentLength?: number; ContentType?: string; Metadata?: Record<string, string> };
      if (!head.ContentLength || head.ContentLength < 16 || head.ContentLength > CHAT_VIDEO.maxBytes || head.ContentType !== (key.endsWith('.webm') ? 'video/webm' : 'video/mp4')
        || head.Metadata?.sha256 !== hash) throw new VideoImportStorageError('INVALID_R2_OBJECT');
      return { sizeBytes: head.ContentLength, sha256: hash };
    },
    async upload(key: string, filePath: string, sizeBytes: number, signal: AbortSignal) {
      const hash = validateKey(key), target = input(key);
      if (!Number.isInteger(sizeBytes) || sizeBytes < 16 || sizeBytes > CHAT_VIDEO.maxBytes) throw new VideoImportStorageError('INVALID_R2_OBJECT');
      signal.throwIfAborted();
      const file = await open(filePath, 'r');
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size !== sizeBytes) throw new VideoImportStorageError('INVALID_R2_OBJECT');
        const deadline = AbortSignal.any([signal, AbortSignal.timeout(60000)]);
        const body = file.createReadStream({ autoClose: false, highWaterMark: 256 * 1024, start: 0, end: sizeBytes - 1, signal: deadline });
        // Attach immediately: abort/read errors must never become unhandled errors.
        const drained = finished(body).catch(() => {});
        try {
          await send(new PutObjectCommand({ ...target, Body: body, ContentLength: sizeBytes, ContentType: key.endsWith('.webm') ? 'video/webm' : 'video/mp4',
            CacheControl: 'private, no-store', Metadata: { sha256: hash },
            // Already computed by the processor; avoids SDK buffering/trailer calculation.
            ChecksumSHA256: Buffer.from(hash, 'hex').toString('base64'),
          }), deadline);
          deadline.throwIfAborted();
        } finally { body.destroy(); await drained; }
      } finally { await file.close(); }
    },
    async remove(key: string, signal: AbortSignal) {
      await send(new DeleteObjectCommand(input(key)), AbortSignal.any([signal, AbortSignal.timeout(20000)]));
    },
  };
}
export const videoImportStorage = createVideoImportStorage();
