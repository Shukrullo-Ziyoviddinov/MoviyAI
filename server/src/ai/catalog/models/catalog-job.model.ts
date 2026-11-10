import { Schema, model } from 'mongoose';

const schema = new Schema({
  _id: { type: String, required: true },
  input: { type: Schema.Types.Mixed, required: true },
  draft: { type: Schema.Types.Mixed, default: null },
  status: { type: String, enum: ['pending', 'processing', 'retry', 'needs-enrichment', 'failed', 'completed'], default: 'pending', required: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  leaseToken: { type: String, default: '' },
  leaseUntil: { type: Date, default: new Date(0) },
  issues: { type: Schema.Types.Mixed, default: [] },
  movieId: { type: Number, default: null },
}, { timestamps: true, collection: 'ai_catalog_save_jobs' });
schema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1 });
export const CatalogSaveJob = model('AiCatalogSaveJob', schema);
