import { Movie } from '../../../models/Movie.js';
import { Actor } from '../../../models/Actor.js';
import type { ClientSession } from 'mongoose';
import { catalogNameKeys } from '../utils/catalog-identity.js';
import type { CatalogMatchRepository, CandidatePage, MovieMatchRecord, ActorMatchRecord } from '../types/catalog-match.types.js';

const LIMIT = 100;
function page<T>(records: T[]): CandidatePage<T> { return { records: records.slice(0, LIMIT), truncated: records.length > LIMIT }; }

/** Read-only. Legacy rows without name keys are included so normalization cannot miss them silently. */
export function createCatalogMatchRepository(session: ClientSession | null = null): CatalogMatchRepository { return {
  async findMovies(input) {
    const clauses: Record<string, unknown>[] = [
      { 'catalogIdentity.nameKeys': { $in: catalogNameKeys([input.originalTitle, ...input.aliases]) } },
      { 'catalogIdentity.nameKeys': { $exists: false }, ...(input.year === null ? {} : { 'specs.year': input.year }) },
    ];
    if (input.imdbId) clauses.push({ 'catalogIdentity.imdbId': input.imdbId });
    if (input.kinopoiskId) clauses.push({ 'catalogIdentity.kinopoiskId': input.kinopoiskId });
    const records = await Movie.find({ $or: clauses }).select('id title specs.year description.uz.director description.ru.director catalogIdentity')
      .sort({ id: 1 }).limit(LIMIT + 1).session(session).lean();
    return page(records as MovieMatchRecord[]);
  },
  async findActors(input) {
    const clauses: Record<string, unknown>[] = [
      { 'catalogIdentity.nameKeys': { $in: catalogNameKeys([input.name, input.originalName, ...(input.aliases ?? [])]) } },
      { 'catalogIdentity.nameKeys': { $exists: false } },
    ];
    if (input.imdbId) clauses.push({ 'catalogIdentity.imdbId': input.imdbId });
    if (input.kinopoiskId) clauses.push({ 'catalogIdentity.kinopoiskId': input.kinopoiskId });
    const records = await Actor.find({ $or: clauses }).select('id actorName catalogIdentity').sort({ id: 1 }).limit(LIMIT + 1).session(session).lean();
    return page(records as ActorMatchRecord[]);
  },
}; }
export const catalogMatchRepository = createCatalogMatchRepository();
