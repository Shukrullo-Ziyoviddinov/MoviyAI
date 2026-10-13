import { apiBaseUrl, apiFetch } from "@/api/client";

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
  const data = await apiFetch<ApiResponse<Banner[]>>("/api/banners", {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15000),
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Banners failed to load");
  }
  return data.data;
}

export function bannerImageUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/banner/${encodeURIComponent(file)}`;
}
