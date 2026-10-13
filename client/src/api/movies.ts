import { apiBaseUrl, apiFetch } from "@/api/client";

export type LocalizedPair = { uz: string; ru: string };

export type MovieDescription = {
  text: string;
  year: number;
  country: string;
  duration: number;
  director: string;
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
  text: string;
  createdAt: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  authorName?: string;
  authorPicture?: string;
  replyCount?: number;
  replies?: MovieComment[];
};

export type Movie = {
  id: number;
  categoryName: string;
  title: LocalizedPair;
  homeImgPoster: string;
  ratingImdb: number;
  ratingKinopoisk: number;
  genre: { uz: string[]; ru: string[] };
  description: { uz: MovieDescription; ru: MovieDescription };
  trailers: string;
  watchUrl: string;
  like: string;
  dislike: string;
  userReaction?: "like" | "dislike" | null;
  commentCount?: number;
  specs: {
    duration: number;
    ageRating: string;
    year: number;
    countries: string[];
  };
  actors?: MovieActor[];
};

export type HomeMovie = Pick<Movie, "id" | "categoryName" | "title" | "homeImgPoster" | "ratingImdb">;

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

export function moviePosterUrl(path?: string) {
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
