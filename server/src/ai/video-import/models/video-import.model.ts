import { Schema, model } from 'mongoose';

const metadata = new Schema({
  durationSeconds: { type: Number, default: null }, sizeBytes: { type: Number, default: null },
  mimeType: { type: String, enum: ['video/mp4', 'video/webm', null], default: null },
  width: { type: Number, default: null }, height: { type: Number, default: null }, hasAudio: { type: Boolean, default: null },
}, { _id: false });
const schema = new Schema({
  _id: { type: String, required: true },
  ownerKind: { type: String, enum: ['user', 'telegram'], required: true },
  ownerId: { type: String, required: true, maxlength: 128 },
  conversationId: { type: String, required: true, maxlength: 128 },
  requestId: { type: String, required: true, maxlength: 128 },
  originalUrl: { type: String, required: true, maxlength: 2048 },
  canonicalUrl: { type: String, required: true, maxlength: 2048 },
  platform: { type: String, enum: ['instagram', 'youtube', 'tiktok'], required: true },
  videoId: { type: String, default: null, maxlength: 128 },
  fingerprint: { type: String, required: true },
  status: { type: String, enum: ['queued', 'processing', 'retry', 'completed', 'failed', 'cancelled'], default: 'queued' },
  stage: { type: String, enum: ['queued', 'url_check', 'downloading', 'probing', 'uploading', 'ready'], default: 'queued' },
  metadata: { type: metadata, default: () => ({}) },
  r2Key: { type: String, default: null, maxlength: 1024 },
  transport: { type: String, enum: ['r2', 'youtube'], default: 'r2' },
  analysisSeconds: { type: Number, default: null, min: 1, max: 180 },
  attempts: { type: Number, default: 0 },
  errorCode: { type: String, default: null, maxlength: 64 },
  nextAttemptAt: { type: Date, default: new Date(0) },
  leaseToken: { type: String, default: '' }, slotId: { type: String, default: '' },
  leaseUntil: { type: Date, default: new Date(0) },
  // No TTL deletion: an R2 reference must survive until explicit storage cleanup.
  expiresAt: { type: Date, default: null }, cleanupPending: { type: Boolean, default: false },
  reservedKeys: { type: [String], default: [] },
  deletedAt: { type: Date, default: null }, purgedAt: { type: Date, default: null },
  cleanupNotBefore: { type: Date, default: new Date(0) }, cleanupNextAt: { type: Date, default: new Date(0) },
  cleanupAttempts: { type: Number, default: 0 },
}, { timestamps: true, collection: 'ai_video_import_jobs' });
schema.index({ ownerKind: 1, ownerId: 1, conversationId: 1, requestId: 1 }, { unique: true });
schema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1, createdAt: 1 });
schema.index({ ownerKind: 1, ownerId: 1, createdAt: -1 });
schema.index({ purgedAt: 1, cleanupNextAt: 1, createdAt: 1 });
export const VideoImportJobModel = model('VideoImportJob', schema);

const slots = new Schema({
  _id: { type: String, required: true }, leaseToken: { type: String, default: '' }, leaseUntil: { type: Date, default: new Date(0) },
}, { collection: 'ai_video_import_slots' });
export const VideoImportSlotModel = model('VideoImportSlot', slots);
