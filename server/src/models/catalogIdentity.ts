import { Schema } from 'mongoose';

export const movieCatalogIdentitySchema = new Schema({
  originalTitle: { type: String, trim: true },
  nameKeys: { type: [String], default: undefined },
  imdbId: { type: String, match: /^tt\d+$/ },
  kinopoiskId: { type: String, match: /^\d+$/ },
}, { _id: false });

export const actorCatalogIdentitySchema = new Schema({
  profileKey: {type:String,match:/^[a-f0-9]{64}$/},
  creditKeys: {type:[String],default:undefined},
  originalName: { type: String, trim: true },
  nameKeys: { type: [String], default: undefined },
  imdbId: { type: String, match: /^nm\d+$/ },
  kinopoiskId: { type: String, match: /^\d+$/ },
  birthDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { _id: false });
