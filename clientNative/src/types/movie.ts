export type LocalizedPair = {
  uz: string;
  ru: string;
};

export type MovieDescriptionLocale = {
  text: string;
  descriptionImg: string;
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
  typeCategory: string[];
  filterCountry: string;
  filterGenre: string[];
  like: string;
  dislike: string;
  userReaction?: 'like' | 'dislike' | null;
  specs: {
    duration: number;
    ageRating: string;
    year: number;
    countries: string[];
  };
  franchiseMovieIds: number[];
};
