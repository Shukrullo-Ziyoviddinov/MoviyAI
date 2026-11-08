export interface ChatImageInput { mimeType: string; data: Buffer }
export interface ChatImageUrl { mimeType: string; fileUri: string }
export interface MovieSearchResult {
  trailer?:import('./movie-trailer.types.js').MovieTrailer|null;
  details?: import('./movie-dossier.types.js').MovieDetails;
  title: string;
  titleUz: string | null;
  titleRu: string | null;
  year: number | null;
  confidence: 'high' | 'medium' | 'low';
  sources: Array<{ title: string; url: string }>;
  posters: Array<{ url: string; sourceUrl: string | null }>;
}
