import { Schema, model, type InferSchemaType } from 'mongoose';

const localizedSchema = new Schema(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
    en: { type: String, required: true },
  },
  { _id: false }
);

const privacyItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['subheading', 'bullet', 'paragraph'],
      required: true,
    },
    text: { type: localizedSchema, required: true },
  },
  { _id: false }
);

const privacySectionSchema = new Schema(
  {
    id: { type: String, required: true },
    icon: { type: String, required: true },
    iconColor: { type: String, required: true },
    iconBg: { type: String, required: true },
    title: { type: localizedSchema, required: true },
    items: { type: [privacyItemSchema], default: [] },
  },
  { _id: false }
);

const privacySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    version: { type: Number, required: true, default: 1 },
    page: {
      title: { type: localizedSchema, required: true },
      subtitle: { type: localizedSchema, required: true },
    },
    sections: { type: [privacySectionSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'privacies',
  }
);

export type PrivacyDocument = InferSchemaType<typeof privacySchema> & {
  _id: Schema.Types.ObjectId;
};

export const Privacy = model('Privacy', privacySchema);
