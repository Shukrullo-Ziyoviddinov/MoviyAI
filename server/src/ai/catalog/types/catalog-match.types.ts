import type { MovieFact, MovieSource } from '../../types/movie-dossier.types.js';

export interface StoredMovieIdentity {
  originalTitle?: string; nameKeys?: string[];
  imdbId?: string; kinopoiskId?: string;
}
export interface StoredActorIdentity {
  originalName?: string; nameKeys?: string[];
  imdbId?: string; kinopoiskId?: string; birthDate?: string;
}
export interface MovieMatchInput {
  originalTitle: string; aliases: string[]; year: number | null;
  imdbId: string | null; kinopoiskId: string | null;
  sources: MovieSource[]; directors?: string[];
}
export interface ActorMatchInput {
  name: string; originalName: string | null; aliases?: string[];
  imdbId: string | null; kinopoiskId: string | null;
  birthDate?: MovieFact<string> | null;
  sources: MovieSource[];
}
export interface MovieMatchRecord {
  id: number; title?: { uz?: string; ru?: string };
  specs?: { year?: number };
  description?: { uz?: { director?: string }; ru?: { director?: string } };
  catalogIdentity?: StoredMovieIdentity;
}
export interface ActorMatchRecord {
  id: number; actorName: string; catalogIdentity?: StoredActorIdentity;
}
export type CatalogMatchResult =
  | { status: 'existing'; id: number; method: 'external-id' | 'title-year' | 'name-birth-date' }
  | { status: 'not-found'; method: 'checked-candidates' }
  | { status: 'needs-research' | 'conflict'; reason: string; candidateIds: number[] };
export interface CandidatePage<T> { records: T[]; truncated: boolean }
export interface CatalogMatchRepository {
  findMovies(input: MovieMatchInput): Promise<CandidatePage<MovieMatchRecord>>;
  findActors(input: ActorMatchInput): Promise<CandidatePage<ActorMatchRecord>>;
}
