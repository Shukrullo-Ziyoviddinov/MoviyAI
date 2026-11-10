export type LocalizedPair = {
  uz: string | null;
  ru: string | null;
};

export type MovieDescriptionLocale = {
  text: string | null;
  year: number | null;
  country: string | null;
  duration: number | null;
  director: string | null;
};

export type Movie = {
  catalogIdentity?: { originalTitle?: string | null };
  id: number;
  categoryName: string | null;
  title: LocalizedPair;
  homeImgPoster: string | null;
  ratingImdb: number | null;
  ratingKinopoisk: number | null;
  genre: {
    uz: string[];
    ru: string[];
  };
  description: {
    uz: MovieDescriptionLocale;
    ru: MovieDescriptionLocale;
  };
  trailers: string | null;
  watchUrl: string | null;
  filterCountry: string | null;
  filterGenre: string[];
  like: string;
  dislike: string;
  userReaction?: 'like' | 'dislike' | null;
  commentCount?: number;
  specs: {
    duration: number | null;
    ageRating: string | null;
    year: number | null;
    countries: string[];
  };
  franchiseMovieIds: number[];
  actorIds?: number[];
  actors?: import('./actor').Actor[];
};

export type MovieComment = {
  id: string;
  movieId: number;
  userId: string;
  text: string | null;
  createdAt: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  authorName?: string;
  authorPicture?: string;
  replyCount?: number;
  replies?: MovieComment[];
};
