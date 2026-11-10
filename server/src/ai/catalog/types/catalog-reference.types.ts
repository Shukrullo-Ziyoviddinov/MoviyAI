import type { CatalogDraft, CatalogIssue, CatalogMovieDraft, CatalogResolvedReferences } from './catalog.types.js';

export interface CatalogReferenceSnapshot {
  genres: Array<{ name: string; nameRu: string }>;
  countries: Array<{ name: string }>;
}
export interface CatalogReferenceRepository { load(): Promise<CatalogReferenceSnapshot> }
export type CatalogReferenceIssue = CatalogIssue & {
  kind: 'missing' | 'ambiguous' | 'invalid-dictionary' | 'unsupported-category' | 'unverified' | 'stale-reference';
  value: string | null;
};
export interface CatalogReferenceResult {
  ready: boolean;
  references: CatalogResolvedReferences | null;
  issues: CatalogReferenceIssue[];
  draft: CatalogDraft;
}
export type CatalogReferenceFields = Pick<CatalogMovieDraft, 'categoryName' | 'genre' | 'filterGenre' | 'filterCountry' | 'specs'>;
