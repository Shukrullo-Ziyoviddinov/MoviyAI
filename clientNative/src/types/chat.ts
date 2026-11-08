export type MovieTrailerData = {videoId:string;url:string;title:string;channel:string|null;kind:'trailer'|'related'};
export type CharacterImage = { kind?: 'actor'|'character'; label: string; imageUrl: string; sourceUrl: string | null };
export type MovieTableFact = { value: string | number | string[] | null; sources: Array<{title:string;url:string}> };
export type MovieTableDetails = Partial<Record<'productionYears'|'countries'|'genres'|'directors'|'writers'|'runtimeMinutes'|'premiere'|'imdb'|'kinopoisk'|'budget'|'boxOffice'|'ageRating', MovieTableFact>> & {checkedAt?:string};
export type MovieSearchResult = {
    trailer?:MovieTrailerData|null;
    details?: MovieTableDetails;
    title: string;
    titleUz: string | null;
    titleRu: string | null;
    year: number | null;
    confidence: 'high' | 'medium' | 'low';
    sources: {
        title: string;
        url: string;
    }[];
    posters: {
        url: string;
        sourceUrl: string | null;
    }[];
};
export type ChatMediaItem = {
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
    file?: Blob;
    stored?: boolean;
    id: string;
    uri: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
};
export type TextChatMessage = {
    characterImages?: CharacterImage[];
    movie?: MovieSearchResult | null;
    role?: 'user' | 'model';
    failed?: boolean;
    id: string;
    kind: 'text';
    text: string;
    createdAt: number;
};
export type MediaChatMessage = {
    id: string;
    kind: 'media';
    items: ChatMediaItem[];
    createdAt: number;
};
export type ChatMessage = TextChatMessage | MediaChatMessage;
