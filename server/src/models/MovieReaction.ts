import { Schema, model, type InferSchemaType } from 'mongoose';

const movieReactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: Number, required: true, index: true },
    type: { type: String, enum: ['like', 'dislike'], required: true },
  },
  {
    timestamps: true,
    collection: 'movie_reactions',
  }
);

movieReactionSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export type MovieReactionDocument = InferSchemaType<
  typeof movieReactionSchema
> & {
  _id: Schema.Types.ObjectId;
};

export const MovieReaction = model('MovieReaction', movieReactionSchema);
