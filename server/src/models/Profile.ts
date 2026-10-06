import { Schema, model, type InferSchemaType } from 'mongoose';

const profileSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    picture: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'profiles',
  }
);

export type ProfileDocument = InferSchemaType<typeof profileSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Profile = model('Profile', profileSchema);
