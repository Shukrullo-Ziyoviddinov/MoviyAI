import { apiBaseUrl } from '@/src/api/client';
import type { ImageSource } from 'expo-image';

function remoteImage(path?: string): ImageSource | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return { uri: path };
  const file = path.split('/').pop() ?? '';
  if (!file || file.includes('..')) return null;
  return { uri: `${apiBaseUrl}/api/media/movieimg/${encodeURIComponent(file)}` };
}

export function resolveMoviePoster(path?: string): ImageSource | null {
  return remoteImage(path);
}
