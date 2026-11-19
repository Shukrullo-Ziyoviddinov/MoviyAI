import { VideoRecognitionModel } from '../models/video-recognition.model.js';
import { VideoImportSlotModel } from '../models/video-import.model.js';
import { isCatalogEligible } from '../../catalog/utils/catalog-chat-input.js';
import { VideoRecognitionError, type VideoRecognitionRepository, type ImportedMovieResult } from '../types/video-recognition.types.js';
const slotId = 'video-import-recognition-v1:0';
const fence = (id: string, token: string) => ({ _id: id, status: 'processing' as const, deletedAt: null, pauseRequested: false, leaseToken: token, leaseUntil: { $gt: new Date() } });
export const videoRecognitionRepository: VideoRecognitionRepository = {
  async get(id) {
    const row = await VideoRecognitionModel.findById(id).lean();
    return row && !row.deletedAt ? { fingerprint: row.fingerprint, result: row.status === 'completed' ? row.result as ImportedMovieResult : null } : null;
  },
  async claim(id, fingerprint, token, until) {
    try { await VideoImportSlotModel.updateOne({ _id: slotId }, { $setOnInsert: { leaseToken: '', leaseUntil: new Date(0) } }, { upsert: true }); }
    catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    const slot = await VideoImportSlotModel.findOneAndUpdate({ _id: slotId, leaseUntil: { $lte: new Date() } }, { $set: { leaseToken: token, leaseUntil: until } }, { returnDocument: 'after' }).lean();
    if (!slot) return null;
    try {
      try { await VideoRecognitionModel.updateOne({ _id: id }, { $setOnInsert: { fingerprint } }, { upsert: true }); }
      catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
      const row = await VideoRecognitionModel.findOneAndUpdate({ _id: id, fingerprint, deletedAt: null, status: { $ne: 'completed' }, leaseUntil: { $lte: new Date() } },
        { $set: { status: 'processing', pauseRequested: false, leaseToken: token, leaseUntil: until } }, { returnDocument: 'after' }).lean();
      if (!row) { await this.release(id, token); return null; }
      return (row.checkpoints ?? {}) as Record<string, unknown>;
    } catch (error) { await this.release(id, token); throw error; }
  },
  async checkpoint(id, token, key, value) {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new VideoRecognitionError('ANALYSIS_CONFLICT');
    return (await VideoRecognitionModel.updateOne(fence(id, token), { $set: { [`checkpoints.${key}`]: value } })).matchedCount === 1;
  },
  async alive(id, token) { return !!await VideoRecognitionModel.exists(fence(id, token)); },
  async complete(id, token, result) {
    return (await VideoRecognitionModel.updateOne(fence(id, token), { $set: { status: 'completed', result,
      catalogDispatch: isCatalogEligible(result.movie) ? 'pending' : 'none', leaseToken: '', leaseUntil: new Date(0) }, $unset: { checkpoints: '' } })).matchedCount === 1;
  },
  async release(id, token) {
    try { await VideoRecognitionModel.updateOne({ _id: id, leaseToken: token, status: 'processing' }, { $set: { status: 'pending', leaseToken: '', leaseUntil: new Date(0) } }); }
    finally { await VideoImportSlotModel.updateOne({ _id: slotId, leaseToken: token }, { $set: { leaseToken: '', leaseUntil: new Date(0) } }); }
  },
};
