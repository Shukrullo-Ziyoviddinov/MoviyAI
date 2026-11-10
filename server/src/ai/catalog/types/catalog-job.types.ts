import type { MovieSearchResult } from '../../types/movie-search.types.js';
import type { CatalogDraft, CatalogIssue, CatalogLocale } from './catalog.types.js';
import type { CatalogSaveResult } from './catalog-save.types.js';

export interface CatalogChatInput {
  movie: MovieSearchResult;
  language: CatalogLocale;
  actorImages: Array<{ label: string; imageUrl: string; sourceUrl: string | null }>;
}
export interface CatalogJob {
  id: string; input: CatalogChatInput; draft?: CatalogDraft | null;
  attempts: number; leaseToken: string;
}
export interface CatalogJobRepository {
  claim(now: Date, token: string, leaseUntil: Date): Promise<CatalogJob | null>;
  renew(id: string, token: string, leaseUntil: Date): Promise<boolean>;
  checkpoint(id: string, token: string, draft: CatalogDraft): Promise<boolean>;
  complete(id: string, token: string, movieId: number): Promise<void>;
  defer(id: string, token: string, status: 'retry' | 'failed' | 'needs-enrichment', nextAttemptAt: Date, issues: CatalogIssue[]): Promise<void>;
}
export type CatalogJobProcessor = (input: CatalogChatInput, draft: CatalogDraft | null | undefined, signal: AbortSignal, checkpoint: (draft: CatalogDraft) => Promise<void>) => Promise<CatalogSaveResult>;
