import { Movie } from '../models/Movie.js';

type LeanMovie = {
  id: number;
  title?: { uz?: string; ru?: string };
  trailers?: string;
  filterCountry?: string;
  filterGenre?: string[];
  description?: {
    uz?: { text?: string };
    ru?: { text?: string };
  };
  homeImgPoster?: string;
  [key: string]: unknown;
};

function normalizeToken(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function genreOverlapCount(activeGenres: string[], candidateGenres: string[]) {
  if (!activeGenres.length || !candidateGenres.length) return 0;
  const active = new Set(activeGenres.map(normalizeToken).filter(Boolean));
  let count = 0;
  for (const genre of candidateGenres) {
    const key = normalizeToken(genre);
    if (key && active.has(key)) count += 1;
  }
  return count;
}

/**
 * Rank similar trailer movies by genre + country proximity.
 * - Must share at least 1 filterGenre
 * - Same filterCountry ranks higher
 * - More shared genres rank higher within the same country match tier
 */
export function rankSimilarTrailers(
  active: LeanMovie,
  candidates: LeanMovie[]
) {
  const activeGenres = Array.isArray(active.filterGenre)
    ? active.filterGenre
    : [];
  const activeCountry = normalizeToken(active.filterCountry);

  const ranked = candidates
    .filter((movie) => movie.id !== active.id)
    .filter((movie) => Boolean(String(movie.trailers ?? '').trim()))
    .map((movie) => {
      const genres = Array.isArray(movie.filterGenre) ? movie.filterGenre : [];
      const genreScore = genreOverlapCount(activeGenres, genres);
      const countryMatch =
        activeCountry &&
        normalizeToken(movie.filterCountry) === activeCountry
          ? 1
          : 0;
      const score = countryMatch * 1000 + genreScore;
      return { movie, genreScore, countryMatch, score };
    })
    .filter((row) => row.genreScore > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.movie.id - b.movie.id;
    })
    .map((row) => ({
      ...row.movie,
      similarityScore: row.score,
      matchedGenres: row.genreScore,
      matchedCountry: Boolean(row.countryMatch),
    }));

  return ranked;
}

export async function getSimilarTrailers(movieId: number, limit = 12) {
  const active = (await Movie.findOne({ id: movieId }).lean()) as LeanMovie | null;
  if (!active) return null;

  const candidates = (await Movie.find({
    id: { $ne: movieId },
    trailers: { $exists: true, $nin: [null, ''] },
  }).lean()) as LeanMovie[];

  const ranked = rankSimilarTrailers(active, candidates);
  return ranked.slice(0, Math.max(1, limit));
}
