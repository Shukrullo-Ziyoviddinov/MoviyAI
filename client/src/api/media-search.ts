import { apiBaseUrl, readAuthToken } from './client';
import { readMediaSearchStream } from './media-search-stream';
import { prepareChatVideo } from '@/media/prepare-chat-video';
import type { ChatStage } from '@/types/chat-progress';
import type { MovieSearchResult } from '@/types/chat';

export type SearchHistoryItem = { id: string; title: string; titleUz: string | null; titleRu: string | null; poster: string | null; kind: 'image' | 'video'; createdAt: string };
export type SavedMediaSearch = { id: string; movie: MovieSearchResult; media: { kind: 'image' | 'video'; url: string } };
async function historyRequest<T>(path: string, method = 'GET', signal?: AbortSignal): Promise<T> {
  const token = readAuthToken(); if (!token) throw new Error('Authentication required');
  const response = await fetch(apiBaseUrl + '/api/media-search/history' + path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}` },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Search history unavailable');
  const result = await response.json(); if (!result.ok) throw new Error('Search history unavailable');
  return result.data;
}
export const fetchSearchHistory = (cursor: string | null = null, signal?: AbortSignal) => historyRequest<{ items: SearchHistoryItem[]; nextCursor: string | null }>(cursor ? '?cursor=' + encodeURIComponent(cursor) : '', 'GET', signal);
export const readSearchHistory = (id: string, signal?: AbortSignal) => historyRequest<SavedMediaSearch>('/' + encodeURIComponent(id), 'GET', signal);
export const deleteSearchHistory = (id: string) => historyRequest<{ id: string; pending: boolean }>('/' + encodeURIComponent(id), 'DELETE');

export function mediaKind(file: File): 'image' | 'video' {
  const video = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
  if (video && file.size <= 80 * 1024 * 1024) return 'video';
  if (!video && ['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= 4 * 1024 * 1024) return 'image';
  throw Object.assign(new Error('Invalid media'), { failureCode: 'invalid_media' });
}
export async function searchFromMedia(file: File, id: string, language: string, signal: AbortSignal, progress: (stage: ChatStage) => void) {
  const token = readAuthToken(); if (!token) throw new Error('Authentication required');
  const kind = mediaKind(file);
  if (kind === 'video') progress('preparing_video');
  const prepared = kind === 'video' ? await prepareChatVideo(file, signal) : file;
  signal.throwIfAborted();
  const mimeType = prepared.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : /\.webm$/i.test(file.name) ? 'video/webm' : 'video/mp4');
  const digest = await crypto.subtle.digest('SHA-256', await prepared.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const transfer = (ms: number) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  progress(kind === 'video' ? 'upload_video' : 'upload_image');
  const reservation = await fetch(apiBaseUrl + '/api/media-search/uploads', { method: 'POST', headers,
    body: JSON.stringify({ id, kind, hash, size: prepared.size, mimeType }), signal: transfer(75000), cache: 'no-store' });
  if (!reservation.ok) throw Object.assign(new Error('Upload reservation failed'), { failureCode: reservation.status === 429 ? 'rate_limited' : 'upload_failed' });
  const upload = await reservation.json();
  if (!upload.ok || !upload.data?.url) throw new Error('Invalid upload reservation');
  const uploaded = await fetch(upload.data.url, { method: 'PUT', headers: upload.data.headers, body: prepared, signal: transfer(180000) });
  if (!uploaded.ok) throw Object.assign(new Error('Upload failed'), { failureCode: 'upload_failed' });
  progress(kind === 'video' ? 'analyzing_video' : 'analyzing_image');
  return readMediaSearchStream(await fetch(apiBaseUrl + `/api/media-search/${id}/analyze`, {
    method: 'POST', headers: { ...headers, Accept: 'text/event-stream' }, body: JSON.stringify({ language }), signal: transfer(240000), cache: 'no-store',
  }), progress);
}
