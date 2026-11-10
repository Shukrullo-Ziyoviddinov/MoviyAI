import { Schema, model, type InferSchemaType } from 'mongoose';

const countrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    catalogAliases: { type: [String], default: undefined },
    catalogKeys: { type: [String], default: undefined },
    catalogEvidence: { type: Schema.Types.Mixed, default: undefined, select:false },
  },
  {
    timestamps: true,
    collection: 'countries',
  }
);

export type CountryDocument = InferSchemaType<typeof countrySchema> & {
  _id: Schema.Types.ObjectId;
};

countrySchema.index({ catalogKeys:1 },{unique:true,partialFilterExpression:{catalogKeys:{$exists:true}}});
export const Country = model('Country', countrySchema);
