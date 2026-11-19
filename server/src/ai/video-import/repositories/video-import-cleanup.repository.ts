import { VideoImportJobModel } from '../models/video-import.model.js';
import { VideoRecognitionModel } from '../models/video-recognition.model.js';
import { Conversation } from '../../models/conversation.model.js';
import { BotUpdate } from '../../../bot/models.js';

export type CleanupImport = {
  _id: string; ownerKind: string; ownerId: string; conversationId: string; requestId: string; createdAt: Date;
  deletedAt?: Date | null; r2Key?: string | null; reservedKeys?: string[]; leaseToken?: string; leaseUntil?: Date;
  cleanupNotBefore?: Date; cleanupNextAt?: Date; cleanupAttempts?: number;
};
export const videoImportCleanupRepository = {
  async candidates(now: Date, conversation?: { userId: string; id: string }): Promise<CleanupImport[]> {
    const scope = conversation ? { conversationId: conversation.id, $or: [{ ownerKind: 'user' as const, ownerId: conversation.userId }, { ownerKind: 'telegram' as const }] }
      : { $or: [{ cleanupNextAt: { $exists: false } }, { cleanupNextAt: { $lte: now } }] };
    return VideoImportJobModel.find({ purgedAt: null, ...scope }).sort({ cleanupNextAt: 1, createdAt: 1 }).limit(20).lean();
  },
  async deletedConversation(userId: string, id: string) { return !!await Conversation.exists({ _id: id, userId, deletedAt: { $ne: null } }); },
  async shouldDelete(row: CleanupImport, now: Date) {
    if (row.deletedAt) return true;
    const conversation = await Conversation.findById(row.conversationId).select('deletedAt userId').lean();
    if (conversation?.deletedAt) return true;
    if (row.ownerKind === 'user') return !conversation && now.getTime() - row.createdAt.getTime() > 86400000;
    const update = await BotUpdate.findOne({ _id: row.requestId.replace(/^telegram-/, ''), telegramId: row.ownerId }).select('expiresAt').lean();
    return update ? update.expiresAt <= now : now.getTime() - row.createdAt.getTime() > 86400000;
  },
  async mark(row: CleanupImport, now: Date): Promise<CleanupImport | null> {
    const saved = await VideoImportJobModel.findOneAndUpdate({ _id: row._id, purgedAt: null },
      { $set: { deletedAt: row.deletedAt ?? now, status: 'cancelled', cleanupPending: true } }, { returnDocument: 'after' }).lean();
    if (!saved) return null;
    // Tombstone the recognition record before deleting its media, including when
    // a request passed its import ownership check just before deletion.
    const analysis = await VideoRecognitionModel.findOneAndUpdate({ _id: row._id },
      { $set: { deletedAt: saved.deletedAt, pauseRequested: true }, $setOnInsert: { fingerprint: 'deleted' } }, { upsert: true, returnDocument: 'after' }).lean();
    const liveUntil = Math.max(saved.leaseToken ? saved.leaseUntil.getTime() : 0, analysis?.leaseToken ? analysis.leaseUntil.getTime() : 0);
    const notBefore = new Date(Math.max(saved.cleanupNotBefore?.getTime() ?? 0, liveUntil > now.getTime() ? liveUntil + 60000 : 0));
    await VideoImportJobModel.updateOne({ _id: row._id, purgedAt: null }, { $max: { cleanupNotBefore: notBefore } });
    return { ...saved, cleanupNotBefore: notBefore };
  },
  async defer(row: CleanupImport, when: Date, attempts: number, pending: boolean) {
    await VideoImportJobModel.updateOne({ _id: row._id, purgedAt: null }, { $set: { cleanupNextAt: when, cleanupAttempts: attempts, cleanupPending: pending } });
  },
  async complete(row: CleanupImport, now: Date) {
    await VideoImportJobModel.updateOne({ _id: row._id, deletedAt: { $ne: null }, purgedAt: null },
      { $set: { r2Key: null, reservedKeys: [], purgedAt: now, cleanupPending: false, cleanupAttempts: 0 } });
  },
  async removeFinishedResults(now: Date) {
    // Pending catalog outboxes survive until their public film input is copied.
    // Keep a tiny tombstone: a delayed pre-deletion caller must not recreate a
    // fresh analysis lease after the public result/checkpoints are removed.
    await VideoRecognitionModel.updateMany({ deletedAt: { $ne: null }, catalogDispatch: { $ne: 'pending' }, leaseUntil: { $lte: now } },
      { $unset: { result: '', checkpoints: '' } });
  },
};
