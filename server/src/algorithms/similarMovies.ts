export type SimilarMovieLean = {
  id: number;
  franchiseMovieIds?: number[];
  filterCountry?: string;
  filterGenre?: string[];
  [key: string]: unknown;
};

export type RankedSimilarMovie = SimilarMovieLean & {
  similarityKind: 'franchise' | 'scored';
  similarityScore: number;
  matchedGenres: number;
  matchedCountry: boolean;
  franchiseOrder?: number;
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
 * Similar movies ranking (one list, two tiers):
 * 1) Franchise — `franchiseMovieIds` order (first id = top). Always first when set.
 * 2) Genre + country score — shared `filterGenre` count + matching `filterCountry`
 *    raise the score. Always after franchise.
 */
export function rankSimilarMovies(
  active: SimilarMovieLean,
  candidates: SimilarMovieLean[]
): RankedSimilarMovie[] {
  const byId = new Map(candidates.map((movie) => [movie.id, movie]));
  const franchiseIds = Array.isArray(active.franchiseMovieIds)
    ? active.franchiseMovieIds.map(Number).filter(Number.isFinite)
    : [];

  const franchiseSeen = new Set<number>();
  const franchiseRows: RankedSimilarMovie[] = [];
  for (const id of franchiseIds) {
    if (id === active.id || franchiseSeen.has(id)) continue;
    const movie = byId.get(id);
    if (!movie) continue;
    franchiseSeen.add(id);
    franchiseRows.push({
      ...movie,
      similarityKind: 'franchise',
      similarityScore: Number.MAX_SAFE_INTEGER,
      matchedGenres: 0,
      matchedCountry: false,
      franchiseOrder: franchiseRows.length,
    });
  }

  const activeGenres = Array.isArray(active.filterGenre) ? active.filterGenre : [];
  const activeCountry = normalizeToken(active.filterCountry);

  const scoredRows = candidates
    .filter((movie) => movie.id !== active.id)
    .filter((movie) => !franchiseSeen.has(movie.id))
    .map((movie) => {
      const genres = Array.isArray(movie.filterGenre) ? movie.filterGenre : [];
      const genreScore = genreOverlapCount(activeGenres, genres);
      const countryMatch =
        activeCountry && normalizeToken(movie.filterCountry) === activeCountry
          ? 1
          : 0;
      const score = genreScore * 10 + countryMatch * 5;
      return { movie, genreScore, countryMatch, score };
    })
    .filter((row) => row.genreScore > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.movie.id - b.movie.id;
    })
    .map((row) => ({
      ...row.movie,
      similarityKind: 'scored' as const,
      similarityScore: row.score,
      matchedGenres: row.genreScore,
      matchedCountry: Boolean(row.countryMatch),
    }));

  return [...franchiseRows, ...scoredRows];
}
