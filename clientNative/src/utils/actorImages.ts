import { apiBaseUrl } from '@/src/api/client';
import type { ImageSource } from 'expo-image';

export function resolveActorImage(path?: string): ImageSource | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return { uri: path };
  const file = path.split('/').pop() ?? '';
  if (!file || file.includes('..')) return null;
  return { uri: `${apiBaseUrl}/api/media/actorimg/${encodeURIComponent(file)}` };
}
