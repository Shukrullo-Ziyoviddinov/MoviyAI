import { apiBaseUrl, readAuthToken } from "@/api/client";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

async function wishlistFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = readAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  return (await response.json()) as T;
}

export type WishlistMovie = {
  id: number;
  title: { uz: string; ru: string };
  homeImgPoster: string;
  ratingImdb: number;
};

export async function fetchWishlistIds(): Promise<number[]> {
  if (!readAuthToken()) return [];
  const data = await wishlistFetch<ApiResponse<number[]>>("/api/wishlist/ids");
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Wishlist ids failed");
  }
  return data.data;
}

export async function toggleWishlistMovie(movieId: number) {
  const data = await wishlistFetch<ApiResponse<{ saved: boolean; movieId: number }>>("/api/wishlist/toggle", {
    method: "POST",
    body: JSON.stringify({ movieId }),
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Wishlist toggle failed");
  }
  return data.data;
}

export async function fetchWishlistMovies(): Promise<WishlistMovie[]> {
  if (!readAuthToken()) return [];
  const data = await wishlistFetch<ApiResponse<WishlistMovie[]>>("/api/wishlist");
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
