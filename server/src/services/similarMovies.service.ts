import { rankSimilarMovies, type SimilarMovieLean } from '../algorithms/similarMovies.js';
import { Movie } from '../models/Movie.js';

export async function getSimilarMovies(movieId: number, limit = 16) {
  const active = (await Movie.findOne({ id: movieId }).lean()) as SimilarMovieLean | null;
  if (!active) return null;

  const candidates = (await Movie.find({
    id: { $ne: movieId },
  }).lean()) as SimilarMovieLean[];

  const ranked = rankSimilarMovies(active, candidates);
  return ranked.slice(0, Math.max(1, limit));
}
