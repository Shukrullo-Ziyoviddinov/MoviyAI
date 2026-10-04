import { Schema, model, type InferSchemaType } from 'mongoose';

const wishlistSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: Number, required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'wishlists',
  }
);

wishlistSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export type WishlistDocument = InferSchemaType<typeof wishlistSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Wishlist = model('Wishlist', wishlistSchema);
