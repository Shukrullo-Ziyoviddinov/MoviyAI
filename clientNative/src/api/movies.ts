import { api } from '@/src/api/client';
import type { Movie, MovieComment } from '@/src/types/movie';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export type MovieReactionResult = {
  movieId: number;
  like: string;
  dislike: string;
  userReaction: 'like' | 'dislike' | null;
};

export type MovieCommentsResult = {
  comments: MovieComment[];
  commentCount: number;
};

export type CreateCommentResult = {
  comment: MovieComment;
  commentCount: number;
};

export type CommentRepliesResult = {
  replies: MovieComment[];
  replyCount: number;
  skip: number;
  limit: number;
  hasMore: boolean;
};

export async function fetchMovies(): Promise<Movie[]> {
  const { data } = await api.get<ApiResponse<Movie[]>>('/api/movies');
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Movies failed to load');
  }
  return data.data;
}

export async function fetchMovieById(id: number): Promise<Movie> {
  const { data } = await api.get<ApiResponse<Movie>>(`/api/movies/${id}`);
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Movie failed to load');
  }
  return data.data;
}

export async function fetchSimilarTrailers(
  id: number,
  limit = 12
): Promise<Movie[]> {
  const { data } = await api.get<ApiResponse<Movie[]>>(
    `/api/movies/${id}/similar-trailers`,
    { params: { limit } }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Similar trailers failed to load');
  }
  return data.data;
}

export async function toggleMovieReaction(
  id: number,
  type: 'like' | 'dislike'
): Promise<MovieReactionResult> {
  const { data } = await api.post<ApiResponse<MovieReactionResult>>(
    `/api/movies/${id}/reaction`,
    { type }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Reaction failed');
  }
  return data.data;
}

export async function fetchMovieComments(
  id: number,
  limit = 50
): Promise<MovieCommentsResult> {
  const { data } = await api.get<ApiResponse<MovieCommentsResult>>(
    `/api/movies/${id}/comments`,
    { params: { limit } }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Comments failed to load');
  }
  return data.data;
}

export async function fetchCommentReplies(
  movieId: number,
  commentId: string,
  skip = 0,
  limit = 5
): Promise<CommentRepliesResult> {
  const { data } = await api.get<ApiResponse<CommentRepliesResult>>(
    `/api/movies/${movieId}/comments/${commentId}/replies`,
    { params: { skip, limit } }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Replies failed to load');
  }
  return data.data;
}

export async function createMovieComment(
  id: number,
  text: string,
  parentId?: string | null
): Promise<CreateCommentResult> {
  const { data } = await api.post<ApiResponse<CreateCommentResult>>(
    `/api/movies/${id}/comments`,
    { text, parentId: parentId ?? null }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Comment failed');
  }
  return data.data;
}
