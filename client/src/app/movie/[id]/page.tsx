import { Suspense } from "react";
import {
  fetchMovieById,
  fetchMovieComments,
  fetchSimilarMovies,
  fetchSimilarTrailers,
  type Movie,
  type MovieComment,
} from "@/api/movies";
import { MovieDetailScreen } from "@/components/movie/MovieDetailScreen";

export default function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<MovieDetailScreen movieId={0} loading />}>
      <MovieContent params={params} />
    </Suspense>
  );
}

async function MovieContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId)) {
    return <MovieDetailScreen movieId={0} error="Movie not found" />;
  }

  let movie: Movie | null = null;
  let comments: MovieComment[] = [];
  let similar: Movie[] = [];
  let trailers: Movie[] = [];
  let error: string | null = null;

  try {
    movie = await fetchMovieById(movieId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Load failed";
  }

  if (movie) {
    const [commentResult, similarResult, trailerResult] = await Promise.allSettled([
      fetchMovieComments(movieId, 50),
      fetchSimilarMovies(movieId, 16),
      fetchSimilarTrailers(movieId, 12),
    ]);
    if (commentResult.status === "fulfilled") comments = commentResult.value.comments ?? [];
    if (similarResult.status === "fulfilled") similar = similarResult.value ?? [];
    if (trailerResult.status === "fulfilled") trailers = trailerResult.value ?? [];
  }

  return (
    <MovieDetailScreen
      movieId={movieId}
      movie={movie}
      comments={comments}
      similar={similar}
      trailers={trailers}
      error={error}
    />
  );
}
