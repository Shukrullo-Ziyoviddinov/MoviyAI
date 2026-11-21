import type { MovieSearchResult } from '../ai/types/movie-search.types.js';

/** Count identified films, never failed guesses, recommendations or detail-only follow-ups. */
export function isCountableMovieSearch(movie?: MovieSearchResult | null, identificationPerformed = true): boolean {
  return identificationPerformed && !!movie && ['high', 'medium'].includes(movie.confidence) && !!movie.title?.trim()
    && !movie.linksOnly
    && (Number.isSafeInteger(movie.catalogId) && movie.catalogId! > 0 || (movie.identitySources ?? movie.sources)?.some(source => /^https:\/\//i.test(source.url)) === true);
}
