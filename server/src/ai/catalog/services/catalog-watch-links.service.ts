import { Movie } from '../../../models/Movie.js';
import type { MovieSearchResult } from '../../types/movie-search.types.js';
import { uzbekDetailUrl } from '../../services/uzbek-movie.service.js';
import { prepareCatalogDraft } from '../mappers/movie.mapper.js';
import { catalogMatcher, movieMatchInput } from './catalog-match.service.js';

const defaults = {
  match: (movie: MovieSearchResult) => catalogMatcher.movie(movieMatchInput(prepareCatalogDraft(movie, { language: movie.language ?? 'uz' }))),
  add: async (id: number, urls: string[]) => {
    await Movie.updateOne({ id }, { $addToSet: { watchUrls: { $each: urls } } });
    await Movie.updateOne({ id, watchUrl: { $in: [null, ''] } }, { $set: { watchUrl: urls[0] } });
  },
};

/** Link-only follow-ups enrich an existing film; never insert another movie. */
export function createCatalogWatchLinkSaver(deps = defaults) {
  return async (movie: MovieSearchResult) => {
    const urls = [...new Set((movie.uzbekLinks ?? []).flatMap(link => {
      const url = uzbekDetailUrl(link.url); return url ? [url] : [];
    }))];
    if (!urls.length || movie.confidence === 'low') return;
    const match = await deps.match(movie);
    if (match.status === 'existing') await deps.add(match.id, urls);
  };
}
export const saveCatalogWatchLinks = createCatalogWatchLinkSaver();
