import { Schema, model, type InferSchemaType } from 'mongoose';
import { movieCatalogIdentitySchema } from './catalogIdentity.js';

const localizedPairSchema = new Schema(
  {
    uz: { type: String, default: null },
    ru: { type: String, default: null },
  },
  { _id: false }
);

const descriptionLocaleSchema = new Schema(
  {
    text: { type: String, default: null },
    year: { type: Number, default: null },
    country: { type: String, default: null },
    duration: { type: Number, default: null },
    director: { type: String, default: null },
  },
  { _id: false }
);

const movieSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    categoryName: { type: String, default: null, index: true },
    title: { type: localizedPairSchema, required: true },
    homeImgPoster: { type: String, default: null },
    ratingImdb: { type: Number, default: null },
    ratingKinopoisk: { type: Number, default: null },
    genre: {
      uz: { type: [String], default: [] },
      ru: { type: [String], default: [] },
    },
    description: {
      uz: { type: descriptionLocaleSchema, required: true },
      ru: { type: descriptionLocaleSchema, required: true },
    },
    trailers: { type: String, default: null },
    watchUrl: { type: String, default: null },
    filterCountry: { type: String, default: null },
    filterGenre: { type: [String], default: [] },
    like: { type: String, default: '0' },
    dislike: { type: String, default: '0' },
    specs: {
      duration: { type: Number, default: null },
      ageRating: { type: String, default: null },
      year: { type: Number, default: null },
      countries: { type: [String], default: [] },
    },
    franchiseMovieIds: { type: [Number], default: [] },
    actorIds: { type: [Number], default: [] },
    catalogIdentity: { type: movieCatalogIdentitySchema, default: undefined },
    catalogResearch: { type: Schema.Types.Mixed, default: undefined, select: false },
    catalogPosters: { type: [String], default: undefined },
    catalogMediaKeys: { type: [String], default: undefined, select: false },
  },
  {
    timestamps: true,
    collection: 'movies',
  }
);

movieSchema.index({ 'catalogIdentity.imdbId': 1 }, { unique: true, partialFilterExpression: { 'catalogIdentity.imdbId': { $type: 'string' } } });
movieSchema.index({ 'catalogIdentity.kinopoiskId': 1 }, { unique: true, partialFilterExpression: { 'catalogIdentity.kinopoiskId': { $type: 'string' } } });
movieSchema.index({ 'catalogIdentity.nameKeys': 1 });
movieSchema.index({'catalogIdentity.sourceKeys':1},{unique:true,partialFilterExpression:{'catalogIdentity.sourceKeys':{$exists:true}}});

export type MovieDocument = InferSchemaType<typeof movieSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Movie = model('Movie', movieSchema);
