import type { MovieFact, MovieSource } from '../../types/movie-dossier.types.js';

export interface StoredMovieIdentity {
  sourceKeys?:string[];
  originalTitle?: string; nameKeys?: string[];
  imdbId?: string; kinopoiskId?: string;
}
export interface StoredActorIdentity {
  originalName?: string; nameKeys?: string[];
  imdbId?: string; kinopoiskId?: string; birthDate?: string;
  profileKey?: string; creditKeys?: string[];
}
export interface ActorCreditProof { filmTitle:string; year:number; role:string; sources:MovieSource[] }
export interface MovieMatchInput {
  originalTitle: string; aliases: string[]; year: number | null;
  imdbId: string | null; kinopoiskId: string | null;
  sources: MovieSource[]; directors?: string[];
}
export interface ActorMatchInput {
  credit?: ActorCreditProof;
  profile?: MovieSource;
  name: string; originalName: string | null; aliases?: string[];
  imdbId: string | null; kinopoiskId: string | null;
  birthDate?: MovieFact<string> | null;
  sources: MovieSource[];
}
export interface MovieMatchRecord {
  id: number; title?: { uz?: string; ru?: string };
  specs?: { year?: number|null };
  description?: { uz?: { director?: string }; ru?: { director?: string } };
  catalogIdentity?: StoredMovieIdentity;
}
export interface ActorMatchRecord {
  id: number; actorName: string; catalogIdentity?: StoredActorIdentity;
  actorAbout?: {uz?:string;ru?:string};
}
export type CatalogMatchResult =
  | { status: 'existing'; id: number; method: 'external-id' | 'title-year' | 'film-source' | 'name-birth-date' | 'name-film-role' | 'verified-profile' }
  | { status: 'not-found'; method: 'checked-candidates' }
  | { status: 'needs-research' | 'conflict'; reason: string; candidateIds: number[] };
export interface CandidatePage<T> { records: T[]; truncated: boolean }
export interface CatalogMatchRepository {
  findMovies(input: MovieMatchInput): Promise<CandidatePage<MovieMatchRecord>>;
  findActors(input: ActorMatchInput): Promise<CandidatePage<ActorMatchRecord>>;
}
