import type { MovieSearchResult } from '../../types/movie-search.types.js';
export type ImportedMovieResult = { text: string; model: string; movie?: MovieSearchResult };
export interface VideoRecognitionRepository {
  get(id: string): Promise<{ fingerprint: string; result: ImportedMovieResult | null } | null>;
  claim(id: string, fingerprint: string, token: string, until: Date): Promise<Record<string, unknown> | null>;
  checkpoint(id: string, token: string, key: string, value: unknown): Promise<boolean>;
  complete(id: string, token: string, result: ImportedMovieResult): Promise<boolean>;
  release(id: string, token: string): Promise<void>;
  alive(id: string, token: string): Promise<boolean>;
}
export class VideoRecognitionError extends Error {
  constructor(public readonly code: 'IMPORT_NOT_READY' | 'ANALYSIS_BUSY' | 'ANALYSIS_CONFLICT' | 'ANALYSIS_LEASE_LOST') { super(code); this.name = 'VideoRecognitionError'; }
}
