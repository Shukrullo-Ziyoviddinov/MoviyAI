import type { z } from 'zod';
import type { MovieSearchResult } from '../../types/movie-search.types.js';
import type { MovieFact, MovieSource } from '../../types/movie-dossier.types.js';
import type { catalogActorPayloadSchema, catalogMoviePayloadSchema } from '../validators/catalog.validator.js';
import type { MovieMatchInput, ActorCreditProof } from './catalog-match.types.js';

export type CatalogMoviePayload = z.infer<typeof catalogMoviePayloadSchema>;
export type CatalogActorPayload = z.infer<typeof catalogActorPayloadSchema>;
export type CatalogLocale = 'uz' | 'ru' | 'en';
export type CatalogLocalizedFacts = Partial<Record<'uz' | 'ru', {
  title?: MovieFact<string>; synopsis?: MovieFact<string>;
  country?: MovieFact<string>; director?: MovieFact<string>;
}>>;
export interface CatalogResolvedReferences {
  categoryName: CatalogMoviePayload['categoryName'];
  genres: Array<{ name: string; nameRu: string }>;
  countries: string[];
  primaryCountry: string|null;
}
export interface CatalogMovieDraft {
  categoryName: CatalogMoviePayload['categoryName'] | null;
  title: { uz: string | null; ru: string | null };
  homeImgPoster: string | null;
  ratingImdb: number | null; ratingKinopoisk: number | null;
  genre: { uz: string[]; ru: string[] };
  description: Record<'uz' | 'ru', { text: string | null; year: number | null; country: string | null; duration: number | null; director: string | null }>;
  trailers: string|null; watchUrl: string|null;
  filterCountry: string | null; filterGenre: string[];
  like: '0'; dislike: '0';
  specs: { duration: number | null; ageRating: string | null; year: number | null; countries: string[] };
  franchiseMovieIds: number[]; actorIds: number[];
}
export interface CatalogActorDraft {
  imageCandidates?: Array<{ url: string; sourceUrl: string | null }>;
  identity: { imdbId: string | null; kinopoiskId: string | null; birthDate: MovieFact<string> | null };
  credit?: ActorCreditProof;
  profile?: MovieSource;
  enrichmentIssue?: {provider:string;stage:string|null;providerStatus:number|null;errorKind:string};
  existingId: number | null;
  actorName: string; originalName: string | null; role: string | null;
  actorImg: string | null; actorAbout: { uz: string | null; ru: string | null };
  sources: MovieSource[];
}
export interface CatalogDraft {
  localizedFacts?: CatalogLocalizedFacts;
  franchiseCandidates?: Array<{ film: MovieMatchInput; relation: MovieFact<string> }>;
  version: 1;
  identity: { originalTitle: string; year: number | null; imdbId: string | null; kinopoiskId: string | null };
  movie: CatalogMovieDraft;
  actors: CatalogActorDraft[];
  posterCandidates: Array<{ url: string; sourceUrl: string | null }>;
  /** Preserve all sourced facts, extra posters, links and provenance outside the current Movie schema. */
  research: MovieSearchResult;
  language: CatalogLocale;
  /** An optional URL can be empty only after its search completed without a confirmed result. */
  confirmedUnavailable: Array<'trailers' | 'watchUrl'>;
}
export type CatalogIssue = {
  path: string;
  action: 'research' | 'translate' | 'resolve-reference' | 'resolve-actor' | 'store-media' | 'correct';
  blocking: boolean;
  message: string;
};
export type CatalogAssessment = { ready: boolean; issues: CatalogIssue[]; payload: CatalogMoviePayload | null };
