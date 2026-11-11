export interface ChatImageInput { mimeType: string; data: Buffer }
export interface ChatImageUrl { mimeType: string; fileUri: string;durationSeconds?:number }
export interface MovieSearchResult {
  sourceResearchComplete?:boolean;
  catalogId?: number;
  catalogPortraits?: import('../services/character-image.service.js').CharacterImage[];
  /** Evidence for the exact film identity; presentation image links are not identity evidence. */
  identitySources?: import('./movie-dossier.types.js').MovieSource[];
  language?: 'uz' | 'ru' | 'en';
  linksOnly?:boolean;
  uzbekLinks?:import('../services/uzbek-movie.service.js').UzbekMovieLink[];
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
