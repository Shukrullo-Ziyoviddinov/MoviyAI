import { Schema, model, type InferSchemaType } from 'mongoose';

const profileSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    picture: { type: String, default: '' },
    searchGuideVisited: { type: Boolean, default: false },
    searchGuideUnderstood: { type: Boolean, default: false },
    searchGuideUnderstoodAt: { type: Date, default: null },
    chatGuideVisited: { type: Boolean, default: false },
    chatGuideUnderstood: { type: Boolean, default: false },
    chatGuideUnderstoodAt: { type: Date, default: null },
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
