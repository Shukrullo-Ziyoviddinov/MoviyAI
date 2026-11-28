import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { fetch } from 'expo/fetch';
import { api, apiBaseUrl } from './client';
import { getAuthTokenKey, getAuthTokenSync } from '@/src/utils/authToken';
import { getSecureItem } from '@/src/utils/storage';
import { prepareChatVideo } from '@/src/media/prepare-chat-video';
import { readMediaSearchStream } from './media-search-stream';
import type { ChatStage } from '@/src/types/chat-progress';
import type { MovieSearchResult } from '@/src/types/chat';

export type SearchHistoryItem = { id: string; title: string; titleUz: string | null; titleRu: string | null; poster: string | null; kind: 'image' | 'video'; createdAt: string };
export type SavedMediaSearch = { id: string; movie: MovieSearchResult; media: { kind: 'image' | 'video'; url: string } };
async function historyRequest<T>(path: string, method = 'GET', signal?: AbortSignal): Promise<T> {
  const response = await api.request<{ ok: boolean; data: T }>({ url: '/api/media-search/history' + path, method, signal, timeout: 30000 });
  if (!response.data.ok) throw new Error('Search history unavailable');
  return response.data.data;
}
export const fetchSearchHistory = (cursor: string | null = null, signal?: AbortSignal) => historyRequest<{ items: SearchHistoryItem[]; nextCursor: string | null }>(cursor ? '?cursor=' + encodeURIComponent(cursor) : '', 'GET', signal);
export const readSearchHistory = (id: string, signal?: AbortSignal) => historyRequest<SavedMediaSearch>('/' + encodeURIComponent(id), 'GET', signal);
export const deleteSearchHistory = (id: string) => historyRequest<{ id: string; pending: boolean }>('/' + encodeURIComponent(id), 'DELETE');

export type SearchMedia = { uri: string; type: 'image' | 'video'; mimeType?: string; fileName?: string; durationSeconds?: number };
export async function searchFromMedia(media: SearchMedia, id: string, language: string, signal: AbortSignal, progress: (stage: ChatStage) => void) {
  const token = getAuthTokenSync() ?? await getSecureItem(getAuthTokenKey());
  if (!token) throw new Error('Authentication required');
  signal.throwIfAborted();
  const original = new File(media.uri);
  if (media.type === 'video') progress('preparing_video');
  const file = media.type === 'video' ? await prepareChatVideo(original, signal) : original;
  const bytes = await file.arrayBuffer();
  const mimeType = file.uri !== original.uri ? 'video/mp4' : media.mimeType || file.type || (media.type === 'image' ? 'image/jpeg' : 'video/mp4');
  if (!bytes.byteLength || bytes.byteLength > (media.type === 'image' ? 4 : 80) * 1024 * 1024)
    throw Object.assign(new Error('Invalid media'), { failureCode: 'invalid_media' });
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const transfer = (ms: number) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  progress(media.type === 'video' ? 'upload_video' : 'upload_image');
  const reservation = await fetch(apiBaseUrl + '/api/media-search/uploads', { method: 'POST', headers, signal: transfer(75000),
    body: JSON.stringify({ id, kind: media.type, hash, size: bytes.byteLength, mimeType }) });
  if (!reservation.ok) throw Object.assign(new Error('Reservation failed'), { failureCode: reservation.status === 429 ? 'rate_limited' : 'upload_failed' });
  const upload = await reservation.json();
  if (!upload.ok || !upload.data?.url) throw new Error('Invalid upload');
  const uploaded = await fetch(upload.data.url, { method: 'PUT', headers: upload.data.headers, body: new Uint8Array(bytes), signal: transfer(180000) });
  if (!uploaded.ok) throw Object.assign(new Error('Upload failed'), { failureCode: 'upload_failed' });
  progress(media.type === 'video' ? 'analyzing_video' : 'analyzing_image');
  return readMediaSearchStream(await fetch(apiBaseUrl + `/api/media-search/${id}/analyze`, {
    method: 'POST', headers: { ...headers, Accept: 'text/event-stream' }, body: JSON.stringify({ language }), signal: transfer(240000),
  }), progress);
}
