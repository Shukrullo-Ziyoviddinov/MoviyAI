import { VideoImportJobModel, VideoImportSlotModel } from '../models/video-import.model.js';
import { VIDEO_IMPORT_QUEUE } from '../config/video-import.config.js';
import { VideoImportJobError, type VideoImportJobRepository, type VideoImportJob, type VideoImportOwner, type ClaimedVideoImportJob } from '../types/video-import-job.types.js';

type StoredJob = Omit<VideoImportJob, 'id' | 'owner'> & { _id: string; ownerKind: VideoImportOwner['kind']; ownerId: string; deletedAt?: Date | null };
const ownerFilter = (owner: VideoImportOwner) => ({ ownerKind: owner.kind, ownerId: owner.id });
const fence = (job: ClaimedVideoImportJob, now: Date) => ({ _id: job.id, status: 'processing' as const, leaseToken: job.leaseToken, leaseUntil: { $gt: now } });
function toJob(value: unknown): VideoImportJob {
  const row = value as StoredJob;
  return { id: row._id, owner: { kind: row.ownerKind, id: row.ownerId }, conversationId: row.conversationId, requestId: row.requestId,
    originalUrl: row.originalUrl, canonicalUrl: row.canonicalUrl, platform: row.platform, videoId: row.videoId,
    fingerprint: row.fingerprint, status: row.status, stage: row.stage, metadata: { ...row.metadata }, r2Key: row.r2Key,
    transport: row.transport ?? 'r2', analysisSeconds: row.analysisSeconds ?? null,
    attempts: row.attempts, errorCode: row.errorCode, nextAttemptAt: row.nextAttemptAt, createdAt: row.createdAt };
}
async function releaseSlot(slotId: string, token: string) {
  await VideoImportSlotModel.updateOne({ _id: slotId, leaseToken: token }, { $set: { leaseToken: '', leaseUntil: new Date(0) } });
}

export const videoImportJobRepository: VideoImportJobRepository = {
  async enqueue(job) {
    const { id, owner, ...input } = job;
    try {
      await VideoImportJobModel.updateOne({ _id: id, ...ownerFilter(owner) }, { $setOnInsert: { ...input, ...ownerFilter(owner),
        status: 'queued', stage: 'queued', attempts: 0, errorCode: null, r2Key: null, deletedAt: null,
        metadata: { durationSeconds: null, sizeBytes: null, mimeType: null, width: null, height: null, hasAudio: null },
        nextAttemptAt: new Date(0), leaseToken: '', slotId: '', leaseUntil: new Date(0) } }, { upsert: true });
    } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    const row = await VideoImportJobModel.findOne({ _id: id, ...ownerFilter(owner) }).lean();
    if (!row || row.deletedAt || row.fingerprint !== job.fingerprint || row.requestId !== job.requestId || row.conversationId !== job.conversationId)
      throw new VideoImportJobError('REQUEST_CONFLICT');
    return toJob(row);
  },
  async get(owner, id) {
    const row = await VideoImportJobModel.findOne({ _id: id, ...ownerFilter(owner), deletedAt: null }).lean();
    return row ? toJob(row) : null;
  },
  async cancel(owner, id) {
    // A processing slot remains leased until its worker has actually stopped.
    return (await VideoImportJobModel.updateOne({ _id: id, ...ownerFilter(owner), status: { $in: ['queued', 'retry', 'processing'] } },
      { $set: { status: 'cancelled', errorCode: null, cleanupPending: true } })).matchedCount === 1;
  },
  async resume(owner, id) {
    return (await VideoImportJobModel.updateOne({ _id: id, ...ownerFilter(owner), deletedAt: null, status: { $in: ['cancelled', 'failed'] },
      $or: [{ leaseToken: '' }, { leaseUntil: { $lte: new Date() } }] },
      { $set: { status: 'retry', errorCode: null, attempts: 0, nextAttemptAt: new Date(0), cleanupPending: false,
        leaseToken: '', leaseUntil: new Date(0), slotId: '' } })).matchedCount === 1;
  },
  async claim(now, token, until) {
    let slotId: string | undefined;
    for (let index = 0; index < VIDEO_IMPORT_QUEUE.parallel; index++) {
      const id = `video-import-v1:${index}`;
      try { await VideoImportSlotModel.updateOne({ _id: id }, { $setOnInsert: { leaseToken: '', leaseUntil: new Date(0) } }, { upsert: true }); }
      catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
      const slot = await VideoImportSlotModel.findOneAndUpdate({ _id: id, leaseUntil: { $lte: now } },
        { $set: { leaseToken: token, leaseUntil: until } }, { returnDocument: 'after' }).lean();
      if (slot) { slotId = id; break; }
    }
    if (!slotId) return null;
    try {
      await VideoImportJobModel.updateMany({ status: 'processing', leaseUntil: { $lte: now }, attempts: { $gte: VIDEO_IMPORT_QUEUE.maxAttempts } },
        { $set: { status: 'failed', errorCode: 'ATTEMPTS_EXHAUSTED', cleanupPending: true, leaseToken: '', leaseUntil: new Date(0) } });
      const row = await VideoImportJobModel.findOneAndUpdate({ deletedAt: null, attempts: { $lt: VIDEO_IMPORT_QUEUE.maxAttempts }, $or: [
        { status: { $in: ['queued', 'retry'] }, nextAttemptAt: { $lte: now } },
        { status: 'processing', leaseUntil: { $lte: now } },
      ] }, { $set: { status: 'processing', errorCode: null, leaseToken: token, leaseUntil: until, slotId }, $inc: { attempts: 1 } },
      { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: 'after' }).lean();
      if (row) return { ...toJob(row), leaseToken: token, slotId };
    } catch (error) { await releaseSlot(slotId, token); throw error; }
    await releaseSlot(slotId, token);
    return null;
  },
  async renew(job, now, until) {
    const slot = await VideoImportSlotModel.updateOne({ _id: job.slotId, leaseToken: job.leaseToken, leaseUntil: { $gt: now } }, { $set: { leaseUntil: until } });
    if (slot.matchedCount !== 1) return false;
    return (await VideoImportJobModel.updateOne(fence(job, now), { $set: { leaseUntil: until } })).matchedCount === 1;
  },
  async checkpoint(job, patch, now) {
    const { metadata, ...fields } = patch;
    const changes: Record<string, unknown> = { ...fields };
    for (const [key, value] of Object.entries(metadata ?? {})) changes[`metadata.${key}`] = value;
    return (await VideoImportJobModel.updateOne(fence(job, now), { $set: changes,
      ...(patch.r2Key ? { $addToSet: { reservedKeys: patch.r2Key } } : {}) })).matchedCount === 1;
  },
  async complete(job, result, now) {
    return (await VideoImportJobModel.updateOne(fence(job, now), { $set: { ...result, status: 'completed', stage: 'ready', errorCode: null,
      leaseToken: '', leaseUntil: new Date(0), slotId: '' } })).matchedCount === 1;
  },
  async defer(job, status, code, next, now) {
    return (await VideoImportJobModel.updateOne(fence(job, now), { $set: { status, errorCode: code, nextAttemptAt: next,
      leaseToken: '', leaseUntil: new Date(0), slotId: '', ...(status === 'failed' ? { cleanupPending: true } : {}) } })).matchedCount === 1;
  },
  async release(job) {
    await releaseSlot(job.slotId, job.leaseToken);
    await VideoImportJobModel.updateOne({ _id: job.id, leaseToken: job.leaseToken, status: 'cancelled' },
      { $set: { leaseToken: '', leaseUntil: new Date(0), slotId: '' } });
  },
};
