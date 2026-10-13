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

  const [movieResult, commentResult, similarResult, trailerResult] = await Promise.allSettled([
    fetchMovieById(movieId),
    fetchMovieComments(movieId, 50),
    fetchSimilarMovies(movieId, 16),
    fetchSimilarTrailers(movieId, 12),
  ]);
  if (movieResult.status === "fulfilled") movie = movieResult.value;
  else error = movieResult.reason instanceof Error ? movieResult.reason.message : "Load failed";
  if (movie) {
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
