import type { CatalogActorPayload, CatalogDraft, CatalogIssue, CatalogMoviePayload } from './catalog.types.js';
import type { StoredActorIdentity, StoredMovieIdentity } from './catalog-match.types.js';
import type {ActorMatchInput} from './catalog-match.types.js';
import type { createCatalogMatcher } from '../services/catalog-match.service.js';
import type { CatalogReferenceSnapshot } from './catalog-reference.types.js';
import type { CatalogAsset } from '../services/catalog-media.service.js';

export interface CatalogSaveTransaction {
  verifyActorIdentity?(id:number,input:ActorMatchInput):Promise<void>;
  enqueueActors?(movieId:number,draft:CatalogDraft):Promise<void>;
  movieExists?(movieId:number):Promise<boolean>;
  linkActors?(movieId:number,actorIds:number[],pending:CatalogDraft['actors']):Promise<void>;
  matcher: ReturnType<typeof createCatalogMatcher>;
  references(): Promise<CatalogReferenceSnapshot>;
  nextId(kind: 'movie' | 'actor'): Promise<number>;
  insertActor(input: { id: number; payload: CatalogActorPayload; identity: StoredActorIdentity; research: unknown; mediaKeys: string[] }): Promise<void>;
  insertMovie(input: { id: number; payload: CatalogMoviePayload; identity: StoredMovieIdentity; research: unknown; posters: string[]; mediaKeys: string[] }): Promise<void>;
  linkFranchise(movieId: number, relatedIds: number[]): Promise<void>;
  unreferencedMedia(keys: string[]): Promise<string[]>;
}
export interface CatalogSaveRepository {
  matcher: ReturnType<typeof createCatalogMatcher>;
  references(): Promise<CatalogReferenceSnapshot>;
  transaction<T>(work: (tx: CatalogSaveTransaction) => Promise<T>): Promise<T>;
}
export type CatalogSaveResult =
  | { status: 'existing'; movieId: number }
  | { status: 'created'; movieId: number; actorIds: number[]; posters: string[] }
  | { status: 'needs-enrichment'; issues: CatalogIssue[] };
export interface CatalogSaveMedia {
  store(folder: 'movieimg' | 'actorimg', urls: string[], count: number, track: (key: string) => void, signal: AbortSignal): Promise<CatalogAsset[]>;
  remove(key: string): Promise<void>;
}
export interface CatalogStagedMedia { posters: CatalogAsset[]; actors: Map<number, CatalogAsset> }
export type CatalogSaveInput = CatalogDraft;
