import { Schema, model, type InferSchemaType } from 'mongoose';

const localizedPairSchema = new Schema(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
  },
  { _id: false }
);

const descriptionLocaleSchema = new Schema(
  {
    text: { type: String, required: true },
    descriptionImg: { type: String, required: true },
    year: { type: Number, required: true },
    country: { type: String, required: true },
    duration: { type: Number, required: true },
    director: { type: String, required: true },
  },
  { _id: false }
);

const trailerSchema = new Schema(
  {
    id: { type: Number, required: true },
    trailers: { type: localizedPairSchema, required: true },
  },
  { _id: false }
);

const movieSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    categoryName: { type: String, required: true, index: true },
    title: { type: localizedPairSchema, required: true },
    homeImgPoster: { type: String, required: true },
    ratingImdb: { type: Number, default: 0 },
    ratingKinopoisk: { type: Number, default: 0 },
    genre: {
      uz: { type: [String], default: [] },
      ru: { type: [String], default: [] },
    },
    description: {
      uz: { type: descriptionLocaleSchema, required: true },
      ru: { type: descriptionLocaleSchema, required: true },
    },
    trailersVideo: { type: [trailerSchema], default: [] },
    watchUrl: { type: localizedPairSchema, required: true },
    typeCategory: { type: [String], default: [] },
    filterCountry: { type: String, default: '' },
    filterGenre: { type: [String], default: [] },
    like: { type: String, default: '0' },
    dislike: { type: String, default: '' },
    specs: {
      duration: { type: Number, required: true },
      ageRating: { type: String, required: true },
      year: { type: Number, required: true },
      countries: { type: [String], default: [] },
    },
    franchiseMovieIds: { type: [Number], default: [] },
  },
  {
    timestamps: true,
    collection: 'movies',
  }
);

export type MovieDocument = InferSchemaType<typeof movieSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Movie = model('Movie', movieSchema);
