import { Schema, model } from 'mongoose';

const schema = new Schema({
  _id: { type: String, required: true }, userId: { type: String, required: true },
  kind: { type: String, enum: ['image', 'video'], required: true },
  key: { type: String, required: true }, hash: { type: String, required: true },
  size: { type: Number, required: true }, mimeType: { type: String, required: true },
  status: { type: String, enum: ['reserved', 'processing', 'completed', 'failed'], default: 'reserved' },
  token: { type: String, default: '' }, lockUntil: { type: Date, default: new Date(0) },
  movie: { type: Schema.Types.Mixed, default: null }, checkpoints: { type: Schema.Types.Mixed, default: {} },
  completedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  dispatchPending: { type: Boolean, default: false }, expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: 'ai_media_searches' });
// No TTL: private R2 files must be deleted before removing their references.
schema.index({ expiresAt: 1, lockUntil: 1 });
schema.index({ dispatchPending: 1, status: 1 });
schema.index({ userId: 1, status: 1, deletedAt: 1, createdAt: -1, _id: -1 });
export const MediaSearch = model('MediaSearch', schema);
const lease = new Schema({ _id: String, token: String, until: Date }, { collection: 'ai_media_search_leases' });
export const MediaSearchLease = model('MediaSearchLease', lease);
const deletion = new Schema({
  _id: { type: String, required: true }, key: { type: String, required: true },
  until: { type: Date, required: true }, nextAttemptAt: { type: Date, required: true },
}, { collection: 'ai_media_search_deletions' });
deletion.index({ nextAttemptAt: 1 });
export const MediaSearchDeletion = model('MediaSearchDeletion', deletion);
