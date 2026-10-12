import { apiBaseUrl, apiFetch } from "@/api/client";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export type WishlistMovie = {
  id: number;
  title: { uz: string; ru: string };
  homeImgPoster: string;
  ratingImdb: number;
};

export async function fetchWishlistIds(): Promise<number[]> {
  const data = await apiFetch<ApiResponse<number[]>>("/api/wishlist/ids");
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Wishlist ids failed");
  }
  return data.data;
}

export async function toggleWishlistMovie(movieId: number) {
  const data = await apiFetch<ApiResponse<{ saved: boolean; movieId: number }>>("/api/wishlist/toggle", {
    method: "POST",
    body: JSON.stringify({ movieId }),
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Wishlist toggle failed");
  }
  return data.data;
}

export async function fetchWishlistMovies(): Promise<WishlistMovie[]> {
  const data = await apiFetch<ApiResponse<WishlistMovie[]>>("/api/wishlist");
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Wishlist failed");
  }
  return data.data;
}

export function moviePosterUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/movieimg/${encodeURIComponent(file)}`;
}
