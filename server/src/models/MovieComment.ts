import { Schema, model, type InferSchemaType } from 'mongoose';

const movieCommentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: Number, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    collection: 'movie_comments',
  }
);

movieCommentSchema.index({ movieId: 1, createdAt: -1 });

export type MovieCommentDocument = InferSchemaType<
  typeof movieCommentSchema
> & {
  _id: Schema.Types.ObjectId;
};

export const MovieComment = model('MovieComment', movieCommentSchema);
