import type { MovieSearchResult } from '../../types/movie-search.types.js';
import type { MovieFact } from '../../types/movie-dossier.types.js';
import { uzbekDetailUrl, uzbekReleaseTitle } from '../../services/uzbek-movie.service.js';
import { catalogActorPayloadSchema, catalogMoviePayloadSchema, isPublicHttpsUrl } from '../validators/catalog.validator.js';
import type { CatalogAssessment, CatalogDraft, CatalogIssue, CatalogLocale, CatalogLocalizedFacts, CatalogResolvedReferences } from '../types/catalog.types.js';
import { identityIds } from '../utils/catalog-identity.js';

function sourced<T>(fact?: MovieFact<T>): T | null {
  if (!fact || fact.value === null || typeof fact.value === 'string' && !fact.value.trim() || Array.isArray(fact.value) && !fact.value.length) return null;
  return fact.sources.some(source => isPublicHttpsUrl(source.url)) ? fact.value : null;
}

/** Pure preparation only: no DB writes, media downloads, ID allocation or additional AI calls. */
export function prepareCatalogDraft(result: MovieSearchResult, options: {
  language: CatalogLocale;
  localized?: CatalogLocalizedFacts;
  references?: CatalogResolvedReferences;
  confirmedUnavailable?: CatalogDraft['confirmedUnavailable'];
}): CatalogDraft {
  const details = result.details;
  const references = options.references;
  const runtime = sourced(details?.runtimeMinutes);
  const descriptions = (locale: 'uz' | 'ru') => ({
    text: sourced(options.localized?.[locale]?.synopsis) ?? (locale === options.language ? sourced(details?.synopsis) : null),
    year: result.year,
    country: sourced(options.localized?.[locale]?.country) ?? (locale === options.language ? sourced(details?.countries)?.join(', ') ?? null : null),
    duration: runtime,
    director: sourced(options.localized?.[locale]?.director) ?? (locale === options.language ? sourced(details?.directors)?.join(', ') ?? null : null),
  });
  let selectedTrailer = '';
  if (result.trailer?.kind === 'trailer' && /^[\w-]{11}$/.test(result.trailer.videoId)) {
    try {
      const url = new URL(result.trailer.url);
      if (isPublicHttpsUrl(url.href) && /^(?:www\.)?youtube\.com$/.test(url.hostname) && url.pathname === '/watch' && url.searchParams.get('v') === result.trailer.videoId)
        selectedTrailer = `https://www.youtube.com/watch?v=${result.trailer.videoId}`;
    } catch { /* Invalid links remain unresolved rather than guessed. */ }
  }
  // Keep the verified provider order. All remaining choices are preserved in research.
  const watch = result.uzbekLinks?.map(link => uzbekDetailUrl(link.url)).find(Boolean) ?? '';
  return {
    version: 1,
    identity: {
      originalTitle: result.title.trim(), year: result.year,
      ...identityIds(result.identitySources ?? result.sources, 'movie'),
    },
    language: options.language,
    movie: {
      categoryName: references?.categoryName ?? null,
      title: { uz: uzbekReleaseTitle(result.uzbekLinks??[]) ?? sourced(options.localized?.uz?.title) ?? result.titleUz?.trim() ?? null, ru: sourced(options.localized?.ru?.title) ?? (result.titleRu?.trim() || null) },
      homeImgPoster: null,
      ratingImdb: sourced(details?.imdb), ratingKinopoisk: sourced(details?.kinopoisk),
      genre: { uz: references?.genres.map(genre => genre.name) ?? [], ru: references?.genres.map(genre => genre.nameRu) ?? [] },
      description: { uz: descriptions('uz'), ru: descriptions('ru') },
      trailers: selectedTrailer||null, watchUrl: watch||null,
      filterCountry: references?.primaryCountry ?? null, filterGenre: references?.genres.map(genre => genre.name) ?? [],
      like: '0', dislike: '0',
      specs: { duration: runtime, ageRating: sourced(details?.ageRating), year: result.year, countries: [...(references?.countries ?? [])] },
      franchiseMovieIds: [], actorIds: [],
    },
    actors: (details?.cast ?? []).filter(actor => actor.sources.some(source => isPublicHttpsUrl(source.url))).slice(0, 5).map(actor => ({
      identity: { ...identityIds(actor.sources, 'actor'), birthDate: null },
      existingId: null, actorName: actor.name.trim(), originalName: actor.originalName?.trim() || null,
      role: actor.role, actorImg: null, actorAbout: { uz: null, ru: null }, sources: structuredClone(actor.sources),
    })),
    posterCandidates: result.posters.filter(poster => isPublicHttpsUrl(poster.url)).map(poster => ({ ...poster })),
    research: structuredClone(result),
    confirmedUnavailable: [...(options.confirmedUnavailable ?? [])],
  };
}

/** Every unresolved field has a concrete next action; only a complete payload can pass. */
export function assessCatalogDraft(draft: CatalogDraft): CatalogAssessment {
  const issues: CatalogIssue[] = [];
  if (!draft.identity.originalTitle || draft.research.confidence === 'low' || !draft.research.sources.some(source => isPublicHttpsUrl(source.url)))
    issues.push({ path: 'identity', action: 'research', blocking: true, message: 'A sourced, supported film identity and release year are required.' });
  if (draft.identity.originalTitle !== draft.research.title.trim() || draft.identity.year !== draft.research.year || draft.movie.specs.year !== draft.identity.year)
    issues.push({ path: 'identity', action: 'correct', blocking: true, message: 'Research identity and catalogue release year must agree.' });
  const parsed = catalogMoviePayloadSchema.safeParse(draft.movie);
  if (!parsed.success) for (const issue of parsed.error.issues) {
    const path = issue.path.join('.');
    const action: CatalogIssue['action'] = path === 'homeImgPoster' ? 'store-media'
      : /^(categoryName|genre|filterGenre|filterCountry|specs.countries)/.test(path) ? 'resolve-reference'
      : path === 'actorIds' ? 'resolve-actor'
      : /^(title|description)\.(uz|ru)/.test(path) ? 'translate' : 'research';
    issues.push({ path, action, blocking: true, message: issue.message });
  }
  for (const field of ['trailers', 'watchUrl'] as const) if (!draft.movie[field] && !draft.confirmedUnavailable.includes(field))
    issues.push({ path: field, action: 'research', blocking: false, message: 'Link not found; retain null without guessing a URL.' });
  for (const [index, actor] of draft.actors.entries()) {
    if (!Number.isSafeInteger(actor.existingId) || !actor.existingId || actor.existingId < 1 || !draft.movie.actorIds.includes(actor.existingId))
      issues.push({ path: `actors.${index}.existingId`, action: 'resolve-actor', blocking: true, message: 'Reuse a verified existing actor ID or finish creating the new actor first.' });
    if (!actor.existingId) {
      const actorPayload = catalogActorPayloadSchema.safeParse({ actorName: actor.actorName, actorImg: actor.actorImg, actorAbout: actor.actorAbout });
      if (!actorPayload.success) for (const issue of actorPayload.error.issues) {
        const path = issue.path.join('.');
        issues.push({ path: `actors.${index}.${path}`, action: path === 'actorImg' ? 'store-media' : path.startsWith('actorAbout') ? 'research' : 'correct', blocking: true, message: issue.message });
      }
    }
  }
  if (draft.movie.actorIds.some(id => !draft.actors.some(actor => actor.existingId === id)))
    issues.push({ path: 'actors', action: 'resolve-actor', blocking: true, message: 'Movie actor IDs must correspond to the researched cast.' });
  for (const field of ['productionYears', 'budget', 'boxOffice', 'writers', 'premiere'] as const) {
    if (sourced<string | string[]>(draft.research.details?.[field]) === null)
      issues.push({ path: `research.details.${field}`, action: 'research', blocking: false, message: 'Research missing fact; never fabricate it. This field is outside the current Movie schema.' });
  }
  const ready = parsed.success && !issues.some(issue => issue.blocking);
  return { ready, issues, payload: ready && parsed.success ? parsed.data : null };
}
