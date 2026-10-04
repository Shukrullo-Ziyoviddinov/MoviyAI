import { Schema, model, type InferSchemaType } from 'mongoose';

const localizedSchema = new Schema(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
    en: { type: String, required: true },
  },
  { _id: false }
);

const aboutSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    icon: { type: String, required: true },
    iconColor: { type: String, required: true },
    iconBg: { type: String, required: true },
    defaultOpen: { type: Boolean, default: false },
    title: { type: localizedSchema, required: true },
    body: { type: localizedSchema, required: true },
  },
  { _id: false }
);

const aboutSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    version: { type: Number, required: true, default: 1 },
    page: {
      title: { type: localizedSchema, required: true },
      subtitle: { type: localizedSchema, required: true },
    },
    sections: { type: [aboutSectionSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'abouts',
  }
);

export type AboutDocument = InferSchemaType<typeof aboutSchema> & {
  _id: Schema.Types.ObjectId;
};

export const About = model('About', aboutSchema);
