import { Schema, model, type InferSchemaType } from 'mongoose';

const movieCommentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: Number, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    /** null = top-level comment; string = reply to that comment id */
    parentId: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
    collection: 'movie_comments',
  }
);

movieCommentSchema.index({ movieId: 1, parentId: 1, createdAt: -1 });
movieCommentSchema.index({ parentId: 1, createdAt: 1 });

export type MovieCommentDocument = InferSchemaType<
  typeof movieCommentSchema
> & {
  _id: Schema.Types.ObjectId;
};

export const MovieComment = model('MovieComment', movieCommentSchema);
