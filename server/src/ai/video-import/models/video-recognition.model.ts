import { Schema, model } from 'mongoose';
const schema = new Schema({
  _id: { type: String, required: true }, fingerprint: { type: String, required: true },
  status: { type: String, enum: ['processing', 'pending', 'completed'], default: 'pending' },
  result: { type: Schema.Types.Mixed, default: null }, checkpoints: { type: Schema.Types.Mixed, default: () => ({}) },
  leaseToken: { type: String, default: '' }, leaseUntil: { type: Date, default: new Date(0) },
  catalogDispatch: { type: String, enum: ['none', 'pending', 'queued'], default: 'none' },
  deletedAt: { type: Date, default: null }, pauseRequested: { type: Boolean, default: false },
}, { timestamps: true, collection: 'ai_video_import_results' });
schema.index({ catalogDispatch: 1, createdAt: 1 });
export const VideoRecognitionModel = model('VideoImportRecognition', schema);
