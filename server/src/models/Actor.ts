import { Schema, model, type InferSchemaType } from 'mongoose';

const localizedPairSchema = new Schema(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
  },
  { _id: false }
);

const actorSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    actorName: { type: String, required: true },
    actorImg: { type: String, required: true },
    actorAbout: { type: localizedPairSchema, required: true },
  },
  {
    timestamps: true,
    collection: 'actors',
  }
);

export type ActorDocument = InferSchemaType<typeof actorSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Actor = model('Actor', actorSchema);
