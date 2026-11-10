import { catalogMatchRepository } from '../repositories/catalog-match.repository.js';
import { catalogNameKeys, identityIdEvidence, validBirthDate } from '../utils/catalog-identity.js';
import { isPublicHttpsUrl } from '../validators/catalog.validator.js';
import type { ActorMatchInput, ActorMatchRecord, CatalogMatchRepository, CatalogMatchResult, MovieMatchInput, MovieMatchRecord, StoredActorIdentity, StoredMovieIdentity } from '../types/catalog-match.types.js';
import type { CatalogDraft } from '../types/catalog.types.js';

type ExternalIds = { imdbId?: string | null; kinopoiskId?: string | null };
function sameId(input: ExternalIds, stored?: ExternalIds): boolean {
  return !!stored && (Boolean(input.imdbId && input.imdbId === stored.imdbId) || Boolean(input.kinopoiskId && input.kinopoiskId === stored.kinopoiskId));
}
function conflictingId(input: ExternalIds, stored?: ExternalIds): boolean {
  return !!stored && (Boolean(input.imdbId && stored.imdbId && input.imdbId !== stored.imdbId) || Boolean(input.kinopoiskId && stored.kinopoiskId && input.kinopoiskId !== stored.kinopoiskId));
}
function overlaps(left: string[], right: string[]): boolean { return left.some(value => right.includes(value)); }
function unresolved(status: 'needs-research' | 'conflict', reason: string, rows: Array<{id:number}> = []): CatalogMatchResult {
  return { status, reason, candidateIds: [...new Set(rows.map(row => row.id))] };
}
function externalEvidence(input: MovieMatchInput | ActorMatchInput, kind: 'movie' | 'actor'): boolean {
  const {ids, conflicts} = identityIdEvidence(input.sources, kind);
  return !conflicts.length && (!input.imdbId || input.imdbId === ids.imdbId) && (!input.kinopoiskId || input.kinopoiskId === ids.kinopoiskId);
}
function movieNames(row: MovieMatchRecord): string[] { return catalogNameKeys([row.title?.uz, row.title?.ru, row.catalogIdentity?.originalTitle, ...(row.catalogIdentity?.nameKeys ?? [])]); }
function actorNames(row: ActorMatchRecord): string[] { return catalogNameKeys([row.actorName, row.catalogIdentity?.originalName, ...(row.catalogIdentity?.nameKeys ?? [])]); }

export function matchMovieCandidates(input: MovieMatchInput, rows: MovieMatchRecord[], truncated = false): CatalogMatchResult {
  if (!externalEvidence(input, 'movie')) return unresolved('needs-research', 'External film IDs need matching official film-page evidence.');
  if (truncated) return unresolved('needs-research', 'Candidate limit reached; complete legacy identity indexing before deciding.');
  const exact = rows.filter(row => sameId(input, row.catalogIdentity));
  if (exact.length > 1) return unresolved('conflict', 'External IDs identify multiple catalogue records.', exact);
  if (exact.length === 1) {
    const row = exact[0];
    if (conflictingId(input, row.catalogIdentity) || input.year !== null && row.specs?.year !== undefined && input.year !== row.specs.year)
      return unresolved('conflict', 'External identity contradicts another ID or the release year.', exact);
    return { status: 'existing', id: row.id, method: 'external-id' };
  }
  const names = catalogNameKeys([input.originalTitle, ...input.aliases]);
  if (!names.length || input.year === null || !Number.isInteger(input.year) || input.year < 1880 || !input.sources.some(source => isPublicHttpsUrl(source.url)))
    return unresolved('needs-research', 'Title/year fallback requires a sourced film title and exact release year.');
  const matches = rows.filter(row => row.specs?.year === input.year && overlaps(names, movieNames(row)));
  if (matches.length > 1) return unresolved('needs-research', 'Several films have the same title and year.', matches);
  if (matches.length === 1) {
    const row = matches[0];
    if (conflictingId(input, row.catalogIdentity)) return unresolved('conflict', 'Same title/year has a different known external identity.', matches);
    const directors = catalogNameKeys(input.directors ?? []);
    const storedDirectors = catalogNameKeys([row.description?.uz?.director, row.description?.ru?.director]);
    if (directors.length && storedDirectors.length && !overlaps(directors, storedDirectors))
      return unresolved('needs-research', 'Title/year match needs director identity verification across locales.', matches);
    return { status: 'existing', id: row.id, method: 'title-year' };
  }
  return { status: 'not-found', method: 'checked-candidates' };
}

export function matchActorCandidates(input: ActorMatchInput, rows: ActorMatchRecord[], truncated = false): CatalogMatchResult {
  if (!externalEvidence(input, 'actor')) return unresolved('needs-research', 'Actor IDs need official person pages, not film/character/credits URLs.');
  if (truncated) return unresolved('needs-research', 'Candidate limit reached; complete legacy identity indexing before deciding.');
  const exact = rows.filter(row => sameId(input, row.catalogIdentity));
  if (exact.length > 1) return unresolved('conflict', 'Person IDs identify multiple actors.', exact);
  const birthDate = input.birthDate?.value;
  const verifiedBirth = typeof birthDate === 'string' && validBirthDate(birthDate) && !!input.birthDate?.sources.some(source => isPublicHttpsUrl(source.url));
  if (birthDate !== undefined && birthDate !== null && !verifiedBirth) return unresolved('needs-research', 'Birth date must be a valid, sourced full calendar date.');
  if (exact.length === 1) {
    const row = exact[0];
    if (conflictingId(input, row.catalogIdentity) || verifiedBirth && row.catalogIdentity?.birthDate && row.catalogIdentity.birthDate !== birthDate)
      return unresolved('conflict', 'Person identity or date of birth contradicts stored evidence.', exact);
    return { status: 'existing', id: row.id, method: 'external-id' };
  }
  const names = catalogNameKeys([input.name, input.originalName, ...(input.aliases ?? [])]);
  if (!names.length) return unresolved('needs-research', 'Actor name is missing.');
  const named = rows.filter(row => overlaps(names, actorNames(row)));
  const matches = verifiedBirth ? named.filter(row => row.catalogIdentity?.birthDate === birthDate && !conflictingId(input, row.catalogIdentity)) : [];
  if (matches.length > 1) return unresolved('needs-research', 'Name and birth date still identify more than one actor.', matches);
  if (matches.length === 1) {
    const uncertain = named.filter(row => row.id !== matches[0].id && !row.catalogIdentity?.birthDate && !conflictingId(input, row.catalogIdentity));
    if (uncertain.length) return unresolved('needs-research', 'Another legacy namesake still lacks identity evidence.', named);
    return { status: 'existing', id: matches[0].id, method: 'name-birth-date' };
  }
  if (named.some(row => !conflictingId(input, row.catalogIdentity) && (!verifiedBirth || !row.catalogIdentity?.birthDate || row.catalogIdentity.birthDate === birthDate)))
    return unresolved('needs-research', 'A namesake exists but person identity is not established; never merge by name alone.', named);
  if (!(input.imdbId || input.kinopoiskId) && !verifiedBirth) return unresolved('needs-research', 'Research an official person ID or a sourced full birth date before creating an actor.');
  return { status: 'not-found', method: 'checked-candidates' };
}

export function createCatalogMatcher(repository: CatalogMatchRepository = catalogMatchRepository) {
  return {
    async movie(input: MovieMatchInput): Promise<CatalogMatchResult> {
      if (!externalEvidence(input, 'movie')) return matchMovieCandidates(input, []);
      const page = await repository.findMovies(input); return matchMovieCandidates(input, page.records, page.truncated);
    },
    async actor(input: ActorMatchInput): Promise<CatalogMatchResult> {
      if (!externalEvidence(input, 'actor')) return matchActorCandidates(input, []);
      const page = await repository.findActors(input); return matchActorCandidates(input, page.records, page.truncated);
    },
  };
}
export const catalogMatcher = createCatalogMatcher();

export function movieMatchInput(draft: CatalogDraft): MovieMatchInput {
  return { ...draft.identity, aliases: [draft.movie.title.uz, draft.movie.title.ru].filter((value): value is string => !!value),
    sources: structuredClone(draft.research.identitySources ?? draft.research.sources), directors: draft.research.details?.directors.sources.some(source => isPublicHttpsUrl(source.url)) ? [...(draft.research.details.directors.value ?? [])] : [] };
}
export function actorMatchInput(actor: CatalogDraft['actors'][number]): ActorMatchInput {
  return { name: actor.actorName, originalName: actor.originalName, ...structuredClone(actor.identity), sources: structuredClone(actor.sources) };
}

/** Metadata for future insert stages; never accepts AI numeric IDs or unsourced person IDs. */
export function movieIdentityForInsert(input: MovieMatchInput): StoredMovieIdentity {
  if (matchMovieCandidates(input, []).status !== 'not-found') throw new Error('UNVERIFIED_MOVIE_IDENTITY');
  return { originalTitle: input.originalTitle.trim(), nameKeys: catalogNameKeys([input.originalTitle, ...input.aliases]),
    ...(input.imdbId ? { imdbId: input.imdbId } : {}), ...(input.kinopoiskId ? { kinopoiskId: input.kinopoiskId } : {}) };
}
export function actorIdentityForInsert(input: ActorMatchInput): StoredActorIdentity {
  if (matchActorCandidates(input, []).status !== 'not-found') throw new Error('UNVERIFIED_ACTOR_IDENTITY');
  return { originalName: input.originalName?.trim() || input.name.trim(), nameKeys: catalogNameKeys([input.name, input.originalName, ...(input.aliases ?? [])]),
    ...(input.imdbId ? { imdbId: input.imdbId } : {}), ...(input.kinopoiskId ? { kinopoiskId: input.kinopoiskId } : {}),
    ...(input.birthDate?.value ? { birthDate: input.birthDate.value } : {}) };
}

/** Read-only orchestration. Existing movies skip actor creation/research entirely. */
export async function inspectCatalogDuplicates(draft: CatalogDraft, matcher = catalogMatcher) {
  const movie = await matcher.movie(movieMatchInput(draft));
  const next = structuredClone(draft);
  if (movie.status !== 'not-found') return { movie, actors: [] as CatalogMatchResult[], draft: next };
  const actors = await Promise.all(next.actors.map(actor => matcher.actor(actorMatchInput(actor))));
  next.movie.actorIds = [];
  next.actors.forEach((actor, index) => {
    const result = actors[index]; actor.existingId = result.status === 'existing' ? result.id : null;
    if (actor.existingId && !next.movie.actorIds.includes(actor.existingId)) next.movie.actorIds.push(actor.existingId);
  });
  return { movie, actors, draft: next };
}
