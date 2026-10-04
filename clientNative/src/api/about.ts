import { api } from '@/src/api/client';
import type { AboutData } from '@/src/data/about';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchAbout(): Promise<AboutData> {
  const { data } = await api.get<ApiResponse<AboutData>>('/api/about');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'About content failed to load');
  }
  return data.data;
}
