import { apiFetch } from "@/api/client";
import type { HomeMovie } from "@/api/movies";

export type Actor = {
  id: number;
  actorName: string;
  actorImg: string;
  actorAbout: { uz: string; ru: string };
  movies?: HomeMovie[];
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchActorById(id: number): Promise<Actor> {
  const data = await apiFetch<ApiResponse<Actor>>(`/api/actors/${id}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15000),
  });
  if (!data.ok || data.data == null) {
    throw new Error(data.error || "Actor failed to load");
  }
  return data.data;
}
