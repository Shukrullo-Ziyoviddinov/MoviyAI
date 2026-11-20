import { Schema, model, type InferSchemaType } from 'mongoose';

const profileSchema = new Schema(
  {
    googleId: { type: String },
    email: { type: String },
    telegramId: { type: String },
    telegramUsername: { type: String, default: '' },
    telegramPhotoFileId: { type: String, select: false },
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

for (const field of ['googleId', 'email', 'telegramId'] as const) {
  profileSchema.index({ [field]: 1 }, { name: `${field}_present`, unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });
}

export type ProfileDocument = InferSchemaType<typeof profileSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Profile = model('Profile', profileSchema);
