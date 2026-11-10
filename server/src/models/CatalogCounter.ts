import { Schema, model } from 'mongoose';

const schema = new Schema({
  _id: { type: String, required: true },
  value: { type: Number, required: true, min: 0 },
}, { collection: 'catalogCounters', versionKey: false });
export const CatalogCounter = model('CatalogCounter', schema);
