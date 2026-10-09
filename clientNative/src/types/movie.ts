export type LocalizedPair = {
  uz: string;
  ru: string;
};

export type MovieDescriptionLocale = {
  text: string;
  year: number;
  country: string;
  duration: number;
  director: string;
};

export type Movie = {
  id: number;
  categoryName: string;
  title: LocalizedPair;
  homeImgPoster: string;
  ratingImdb: number;
  ratingKinopoisk: number;
  genre: {
    uz: string[];
    ru: string[];
  };
  description: {
    uz: MovieDescriptionLocale;
    ru: MovieDescriptionLocale;
  };
  trailers: string;
  watchUrl: string;
  filterCountry: string;
  filterGenre: string[];
  like: string;
  dislike: string;
  userReaction?: 'like' | 'dislike' | null;
  commentCount?: number;
  specs: {
    duration: number;
    ageRating: string;
    year: number;
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
  text: string;
  createdAt: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  authorName?: string;
  authorPicture?: string;
  replyCount?: number;
  replies?: MovieComment[];
};
