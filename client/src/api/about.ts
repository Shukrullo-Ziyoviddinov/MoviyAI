import { apiFetch } from "@/api/client";
import type { AboutData } from "@/data/about";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchAbout(): Promise<AboutData> {
  const data = await apiFetch<ApiResponse<AboutData>>("/api/about", {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15000),
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "About content failed to load");
  }
  return data.data;
}
