import { Schema, model, type InferSchemaType } from 'mongoose';

const genreSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    nameRu: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'genres',
  }
);

export type GenreDocument = InferSchemaType<typeof genreSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Genre = model('Genre', genreSchema);
