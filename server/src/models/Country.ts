import { Schema, model, type InferSchemaType } from 'mongoose';

const countrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
    collection: 'countries',
  }
);

export type CountryDocument = InferSchemaType<typeof countrySchema> & {
  _id: Schema.Types.ObjectId;
};

export const Country = model('Country', countrySchema);
