import { Schema, model, type InferSchemaType } from 'mongoose';

const bannerSchema = new Schema(
  {
    img: { type: String, required: true, unique: true },
    movieId: { type: [Number], required: true, default: [] },
  },
  {
    timestamps: true,
    collection: 'banners',
  }
);

export type BannerDocument = InferSchemaType<typeof bannerSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Banner = model('Banner', bannerSchema);
