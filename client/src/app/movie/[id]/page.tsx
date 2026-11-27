import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import {
  fetchMovieById,
  fetchMovieComments,
  fetchSimilarMovies,
  fetchSimilarTrailers,
  moviePosterUrl,
  type Movie,
  type MovieComment,
} from "@/api/movies";
import { MovieDetailScreen } from "@/components/movie/MovieDetailScreen";
import { displayMovieTitle } from "@/utils/movieDisplay";
import { moviePath, siteName, siteOrigin } from "@/utils/site";

type MoviePageProps = { params: Promise<{ id: string }> };

const loadMovie = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) notFound();
  const movieId = Number(id);
  if (!Number.isSafeInteger(movieId) || movieId < 1) notFound();

  const movie = await fetchMovieById(movieId);
  if (!movie) notFound();
  if (id !== String(movieId)) permanentRedirect(moviePath(movieId));
  return movie;
});

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const movie = await loadMovie((await params).id);
  const name = displayMovieTitle(movie, "uz");
  const year = movie.specs?.year ?? movie.description?.uz?.year ?? movie.description?.ru?.year;
  const heading = year ? `${name} (${year})` : name;
  const title = `${heading} | ${siteName}`;
  const overview = movie.description?.uz?.text?.trim() || movie.description?.ru?.text?.trim();
  const details = [heading, movie.description?.uz?.country || movie.specs?.countries?.join(", "),
    (movie.genre?.uz?.length ? movie.genre.uz : movie.genre?.ru)?.join(", ")].filter(Boolean);
  const description = overview?.replace(/\s+/g, " ") || details.join(" · ");
  const origin = siteOrigin();
  const url = `${origin}${moviePath(movie.id)}`;
  const poster = moviePosterUrl(movie.homeImgPoster);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName,
      locale: "uz_UZ",
      type: "video.movie",
      images: poster ? [{ url: poster, alt: name }] : undefined,
    },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const movie = await loadMovie((await params).id);
  const movieId = movie.id;
  let comments: MovieComment[] = [];
  let similar: Movie[] = [];
  let trailers: Movie[] = [];

  const [commentResult, similarResult, trailerResult] = await Promise.allSettled([
    fetchMovieComments(movieId, 50),
    fetchSimilarMovies(movieId, 16),
    fetchSimilarTrailers(movieId, 12),
  ]);
  if (commentResult.status === "fulfilled") comments = commentResult.value.comments ?? [];
  if (similarResult.status === "fulfilled") similar = similarResult.value ?? [];
  if (trailerResult.status === "fulfilled") trailers = trailerResult.value ?? [];

  return (
    <MovieDetailScreen
      movieId={movieId}
      movie={movie}
      comments={comments}
      similar={similar}
      trailers={trailers}
    />
  );
}
