import { api } from '@/src/api/client';
import type { PrivacyData } from '@/src/data/privacy';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchPrivacy(): Promise<PrivacyData> {
  const { data } = await api.get<ApiResponse<PrivacyData>>('/api/privacy');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Privacy content failed to load');
  }
  return data.data;
}
