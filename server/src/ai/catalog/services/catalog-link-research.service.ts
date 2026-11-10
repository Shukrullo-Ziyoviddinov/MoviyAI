import { createMovieTrailerSearch } from '../../services/movie-trailer.service.js';
import { createUzbekMovieSearch, readUzbekPage, discoverUzbekDetails, UZBEK_MOVIE_SITES } from '../../services/uzbek-movie.service.js';
import { searchVideos, searchWeb } from '../../services/serper.service.js';
import type { CatalogDraft } from '../types/catalog.types.js';

/** Optional links may remain empty only after a successful provider search. */
export function createCatalogLinkResearch(deps = { trailerSearch: createMovieTrailerSearch, uzbekSearch: createUzbekMovieSearch, searchVideos, searchWeb, readPage: readUzbekPage, discover: discoverUzbekDetails }) {
return async function researchCatalogLinks(input: CatalogDraft, signal: AbortSignal): Promise<CatalogDraft> {
  const draft = structuredClone(input);
  if (!draft.movie.trailers && !draft.confirmedUnavailable.includes('trailers')) {
    let searched = false;
    const find = deps.trailerSearch({ searchVideos: async (...args) => { signal.throwIfAborted(); const result = await deps.searchVideos(...args); searched = true; return result; } });
    const trailer = await find({ title: draft.identity.originalTitle, titleRu: draft.research.titleRu, year: draft.identity.year });
    if (trailer?.kind === 'trailer') { draft.movie.trailers = trailer.url; draft.research.trailer = trailer; }
    else if (searched) draft.confirmedUnavailable.push('trailers');
  }
  signal.throwIfAborted();
  if (!draft.movie.watchUrl && !draft.confirmedUnavailable.includes('watchUrl')) {
    const sites = new Set<string>();
    const find = deps.uzbekSearch({ searchWeb: async (query, options) => { signal.throwIfAborted(); const result = await deps.searchWeb(query, options); const site = /\bsite:([\w.-]+)/.exec(query)?.[1]; if (site) sites.add(site); return result; }, readPage: deps.readPage, discover: deps.discover });
    const links = await find({ title: draft.identity.originalTitle, titleUz: draft.research.titleUz, titleRu: draft.research.titleRu, year: draft.identity.year });
    if (links.length) { draft.movie.watchUrl = links[0].url; draft.research.uzbekLinks = links; }
    else if (UZBEK_MOVIE_SITES.every(site => sites.has(site))) draft.confirmedUnavailable.push('watchUrl');
  }
  signal.throwIfAborted(); return draft;
}; }
export const researchCatalogLinks = createCatalogLinkResearch();
