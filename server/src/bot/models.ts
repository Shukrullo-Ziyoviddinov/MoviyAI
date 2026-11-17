import { Schema, model } from 'mongoose';
import { randomUUID } from 'node:crypto';

const session = new Schema({
  _id: { type: String, required: true },
  profileId: { type: String, default: null },
  conversationId: { type: String, default: randomUUID },
  history: { type: Schema.Types.Mixed, default: [] },
  movie: { type: Schema.Types.Mixed, default: null },
  lockToken: { type: String, default: '' },
  lockUntil: { type: Date, default: new Date(0) },
}, { timestamps: true, collection: 'telegram_ai_sessions' });
export const BotSession = model('TelegramAiSession', session);

const job = new Schema({
  _id: { type: String, required: true },
  telegramId: { type: String, required: true, index: true },
  update: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'processing', 'ready', 'sent', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: new Date(0) },
  lockToken: { type: String, default: '' },
  lockUntil: { type: Date, default: new Date(0) },
  result: { type: Schema.Types.Mixed, default: null },
  resultAt: { type: Date, default: null },
  catalogPending: { type: Boolean, default: false },
  catalogAttempts: { type: Number, default: 0 },
  catalogNextAttemptAt: { type: Date, default: new Date(0) },
  notification: { type: Schema.Types.Mixed, default: null },
  deliveredParts: { type: Number, default: 0 },
  progressMessageId: { type: Number, default: null },
  resultToken: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true },
  publishedProfileId: { type: String, default: null },
  media: { type: Schema.Types.Mixed, default: null },
  // Telegram prompts/media references are private bot history, never UI turns.
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86400000), index: { expires: 0 } },
}, { timestamps: true, collection: 'telegram_ai_updates' });
job.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
job.index({ catalogPending: 1, catalogNextAttemptAt: 1 });
export const BotUpdate = model('TelegramAiUpdate', job);
