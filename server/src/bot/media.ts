import axios from 'axios';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { telegram } from './api.js';
import { BotUpdate } from './models.js';
import { mediaSignature, validMediaSignature } from './security.js';
import type { TelegramUpdate } from './types.js';
import type { ChatImageUrl } from '../ai/types/movie-search.types.js';

const MAX_BYTES = 20 * 1024 * 1024;
export function selectMedia(update: TelegramUpdate) {
  const message = update.message;
  const video = message?.video ?? (message?.document?.mime_type?.startsWith('video/') ? message.document : null);
  const image = message?.photo?.at(-1) ?? (message?.document?.mime_type?.startsWith('image/') ? message.document : null);
  const file = video ?? image;
  if (!file) {
    if (message?.document) throw Error('BOT_MEDIA_FORMAT');
    return null;
  }
  if ((file.file_size ?? 0) > MAX_BYTES) throw Error('BOT_MEDIA_TOO_LARGE');
  if (video && (!video.duration || video.duration > 180)) throw Error('BOT_VIDEO_DURATION');
  const mimeType = video ? video.mime_type ?? 'video/mp4' : image?.mime_type ?? 'image/jpeg';
  if (!['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw Error('BOT_MEDIA_FORMAT');
  return { fileId: file.file_id, mimeType, durationSeconds: video?.duration };
}
export async function telegramMedia(id: string, update: TelegramUpdate): Promise<ChatImageUrl[]> {
  const media = selectMedia(update);
  if (!media) return [];
  await BotUpdate.updateOne({ _id: id }, { $set: { media } });
  const expires = String(Date.now() + 3600000);
  const fileUri = `${env.publicUrl}/api/telegram/media/${id}?expires=${expires}&signature=${mediaSignature(id, expires)}`;
  return [{ mimeType: media.mimeType, fileUri, durationSeconds: media.durationSeconds }];
}

// Short-lived, signed streaming relay. Files stay in Telegram; no disk or R2 writes.
// Google's fetch never receives the bot token embedded in Telegram's download URL.
export async function relayMedia(req: Request, res: Response) {
  const id = String(req.params.id), expires = String(req.query.expires ?? ''), signature = String(req.query.signature ?? '');
  if (!/^\d+$/.test(id) || !validMediaSignature(id, expires, signature)) { res.sendStatus(403); return; }
  const job = await BotUpdate.findById(id).lean();
  if (!job?.media) { res.sendStatus(404); return; }
  const file = await telegram<{ file_path?: string; file_size?: number }>('getFile', { file_id: job.media.fileId });
  if (!file.file_path || file.file_path.includes('..') || !/^[\w/.-]+$/.test(file.file_path) || (file.file_size ?? 0) > MAX_BYTES) { res.sendStatus(413); return; }
  const abort = new AbortController();
  const close = () => abort.abort();
  res.once('close', close);
  try {
    const range = req.header('range');
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) { res.sendStatus(416); return; }
    const upstream = await axios.request({
      url: `https://api.telegram.org/file/bot${env.telegramBotToken}/${file.file_path}`,
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      responseType: 'stream', timeout: 120000, maxRedirects: 0, signal: abort.signal,
      headers: range ? { Range: range } : {}, validateStatus: status => [200, 206, 416].includes(status),
    });
    if (Number(upstream.headers['content-length']) > MAX_BYTES) {
      upstream.data.destroy(); res.sendStatus(413); return;
    }
    res.status(upstream.status).set('Content-Type', job.media.mimeType).set('Cache-Control', 'private, no-store');
    for (const header of ['content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers[header];
      if (value) res.setHeader(header, String(value));
    }
    if (req.method === 'HEAD' || upstream.status === 416) {
      upstream.data.destroy(); res.end(); return;
    }
    let size = 0;
    const limit = new Transform({ transform(chunk, _encoding, callback) {
      size += chunk.length;
      callback(size > MAX_BYTES ? Error('MEDIA_LIMIT') : null, chunk);
    } });
    await pipeline(upstream.data, limit, res);
  } catch {
    if (!res.headersSent) res.sendStatus(502); else res.destroy();
  } finally { res.off('close', close); }
}
