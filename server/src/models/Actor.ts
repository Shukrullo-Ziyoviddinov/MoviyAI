import { Schema, model, type InferSchemaType } from 'mongoose';
import { actorCatalogIdentitySchema } from './catalogIdentity.js';

const localizedPairSchema = new Schema(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
  },
  { _id: false }
);

const actorSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    actorName: { type: String, required: true },
    actorImg: { type: String, required: true },
    actorAbout: { type: localizedPairSchema, required: true },
    catalogIdentity: { type: actorCatalogIdentitySchema, default: undefined },
    catalogResearch: { type: Schema.Types.Mixed, default: undefined, select: false },
    catalogMediaKeys: { type: [String], default: undefined, select: false },
  },
  {
    timestamps: true,
    collection: 'actors',
  }
);

actorSchema.index({ 'catalogIdentity.imdbId': 1 }, { unique: true, partialFilterExpression: { 'catalogIdentity.imdbId': { $type: 'string' } } });
actorSchema.index({ 'catalogIdentity.kinopoiskId': 1 }, { unique: true, partialFilterExpression: { 'catalogIdentity.kinopoiskId': { $type: 'string' } } });
actorSchema.index({ 'catalogIdentity.nameKeys': 1 });
actorSchema.index({'catalogIdentity.profileKey':1},{unique:true,partialFilterExpression:{'catalogIdentity.profileKey':{$type:'string'}}});

export type ActorDocument = InferSchemaType<typeof actorSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Actor = model('Actor', actorSchema);
