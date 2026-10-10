import { api } from '@/src/api/client';

export type Banner = {
  img: string;
  movieId: number[];
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchBanners(): Promise<Banner[]> {
  const { data } = await api.get<ApiResponse<Banner[]>>('/api/banners');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Banners failed to load');
  }
  return data.data;
}
