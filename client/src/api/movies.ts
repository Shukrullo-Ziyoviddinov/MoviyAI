import { apiBaseUrl, apiFetch } from "@/api/client";

export type LocalizedPair = { uz: string | null; ru: string };

export type MovieDescription = {
  text: string | null;
  year: number | null;
  country: string | null;
  duration: number | null;
  director: string | null;
};

export type MovieActor = {
  id: number;
  actorName: string;
  actorImg: string;
};

export type MovieComment = {
  id: string;
  movieId: number;
  userId: string;
  text: string | null;
  createdAt: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  authorName?: string;
  authorPicture?: string;
  replyCount?: number;
  replies?: MovieComment[];
};

export type Movie = {
  catalogIdentity?: { originalTitle?: string | null };
  id: number;
  categoryName: string | null;
  title: LocalizedPair;
  homeImgPoster: string | null;
  ratingImdb: number | null;
  ratingKinopoisk: number | null;
  genre: { uz: string[]; ru: string[] };
  description: { uz: MovieDescription; ru: MovieDescription };
  trailers: string | null;
  watchUrl: string | null;
  watchUrls?: string[];
  like: string;
  dislike: string;
  userReaction?: "like" | "dislike" | null;
  commentCount?: number;
  specs: {
    duration: number | null;
    ageRating: string | null;
    year: number | null;
    countries: string[];
  };
  actors?: MovieActor[];
};

export type HomeMovie = Pick<Movie, "id" | "categoryName" | "title" | "homeImgPoster" | "ratingImdb" | "catalogIdentity">;

export type MovieCommentsResult = {
  comments: MovieComment[];
  commentCount: number;
};

export type CommentRepliesResult = {
  replies: MovieComment[];
  replyCount: number;
  hasMore: boolean;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

async function read<T>(path: string, fresh = false): Promise<T> {
  const data = await apiFetch<ApiResponse<T>>(path, {
    signal: AbortSignal.timeout(15000),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
  });
  if (!data.ok || data.data == null) {
    throw new Error(data.error || "Request failed");
  }
  return data.data;
}

export async function fetchMovies(): Promise<HomeMovie[]> {
  return read<HomeMovie[]>("/api/movies");
}

export async function fetchMovieById(id: number): Promise<Movie> {
  return read<Movie>(`/api/movies/${id}`);
}

export async function fetchMovieComments(id: number, limit = 50): Promise<MovieCommentsResult> {
  return read<MovieCommentsResult>(`/api/movies/${id}/comments?limit=${limit}`, true);
}

export async function fetchSimilarMovies(id: number, limit = 16): Promise<Movie[]> {
  return read<Movie[]>(`/api/movies/${id}/similar-movies?limit=${limit}`);
}

export async function fetchSimilarTrailers(id: number, limit = 12): Promise<Movie[]> {
  return read<Movie[]>(`/api/movies/${id}/similar-trailers?limit=${limit}`);
}

export async function fetchCommentReplies(movieId: number, commentId: string, skip = 0, limit = 5) {
  return read<CommentRepliesResult>(
    `/api/movies/${movieId}/comments/${commentId}/replies?skip=${skip}&limit=${limit}`,
    true,
  );
}

export async function toggleMovieReaction(id: number, type: "like" | "dislike") {
  const data = await apiFetch<
    ApiResponse<{ movieId: number; like: string; dislike: string; userReaction: "like" | "dislike" | null }>
  >(`/api/movies/${id}/reaction`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  if (!data.ok || !data.data) throw new Error(data.error || "Reaction failed");
  return data.data;
}

export async function createMovieComment(id: number, text: string, parentId?: string | null) {
  const data = await apiFetch<ApiResponse<{ comment: MovieComment; commentCount: number }>>(
    `/api/movies/${id}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ text, parentId: parentId ?? null }),
    },
  );
  if (!data.ok || !data.data) throw new Error(data.error || "Comment failed");
  return data.data;
}

export function moviePosterUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/movieimg/${encodeURIComponent(file)}`;
}

export function actorImageUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.split("/").pop() ?? "";
  if (!file || file.includes("..")) return "";
  return `${apiBaseUrl}/api/media/actorimg/${encodeURIComponent(file)}`;
}
