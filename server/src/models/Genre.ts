import { Schema, model, type InferSchemaType } from 'mongoose';

const genreSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    nameRu: { type: String, default: '' },
    catalogAliases: { type: [String], default: undefined },
    catalogKeys: { type: [String], default: undefined },
    catalogCategory: { type: String, enum: ['actionMovies','horrorMovies','animationMovies','romanceMovies','dramaMovies','comedyMovies','familyMovies','sciFiMovies'], default: undefined },
    catalogEvidence: { type: Schema.Types.Mixed, default: undefined, select:false },
  },
  {
    timestamps: true,
    collection: 'genres',
  }
);

export type GenreDocument = InferSchemaType<typeof genreSchema> & {
  _id: Schema.Types.ObjectId;
};

genreSchema.index({ catalogKeys:1 },{unique:true,partialFilterExpression:{catalogKeys:{$exists:true}}});
export const Genre = model('Genre', genreSchema);
