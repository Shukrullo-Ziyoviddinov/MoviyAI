export interface SerperSearchOptions {
  gl?: string;
  hl?: string;
  num?: number;
  page?: number;
}

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position: number;
  date?: string;
}

export interface SerperImageResult {
  title: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
  link?: string;
  position: number;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: Record<string, unknown>;
  answerBox?: Record<string, unknown>;
  relatedSearches?: Array<{ query: string }>;
  credits?: number;
}

export interface SerperImagesResponse {
  images?: SerperImageResult[];
  credits?: number;
}
export interface SerperVideoResult {
  title: string; link: string; snippet?: string; channel?: string; date?: string;
  duration?: string; imageUrl?: string; position?: number;
}
export interface SerperVideosResponse {videos?:SerperVideoResult[];credits?:number}
