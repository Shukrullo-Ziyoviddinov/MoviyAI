import { api } from '@/src/api/client';
import type { Actor } from '@/src/types/actor';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchActors(): Promise<Actor[]> {
  const { data } = await api.get<ApiResponse<Actor[]>>('/api/actors');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Actors failed to load');
  }
  return data.data;
}

export async function fetchActorById(id: number): Promise<Actor> {
  const { data } = await api.get<ApiResponse<Actor>>(`/api/actors/${id}`);
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Actor failed to load');
  }
  return data.data;
}
