import { CatalogSaveJob } from '../models/catalog-job.model.js';
import type { CatalogDraft } from '../types/catalog.types.js';
import type { CatalogChatInput, CatalogJobRepository } from '../types/catalog-job.types.js';

export const catalogJobRepository: CatalogJobRepository = {
  async claim(now, token, leaseUntil) {
    await CatalogSaveJob.updateMany({ status: 'processing', leaseUntil: { $lte: now }, attempts: { $gte: 5 } }, { $set: { status: 'failed', leaseToken: '', leaseUntil: new Date(0) } });
    const job = await CatalogSaveJob.findOneAndUpdate({ attempts: { $lt: 5 }, $or: [
      { status: { $in: ['pending', 'retry', 'needs-enrichment'] }, nextAttemptAt: { $lte: now } },
      { status: 'processing', leaseUntil: { $lte: now } },
    ] }, { $set: { status: 'processing', leaseToken: token, leaseUntil }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: 'after' }).lean();
    return job ? { id: job._id, input: job.input as CatalogChatInput, draft: job.draft as CatalogDraft | null, attempts: job.attempts, leaseToken: token } : null;
  },
  async renew(id, token, leaseUntil) { return (await CatalogSaveJob.updateOne({ _id: id, status: 'processing', leaseToken: token }, { $set: { leaseUntil } })).matchedCount === 1; },
  async checkpoint(id, token, draft) { return (await CatalogSaveJob.updateOne({ _id: id, status: 'processing', leaseToken: token }, { $set: { draft } })).matchedCount === 1; },
  async complete(id, token, movieId) { await CatalogSaveJob.updateOne({ _id: id, status: 'processing', leaseToken: token }, { $set: { status: 'completed', movieId, issues: [], leaseToken: '', leaseUntil: new Date(0) }, $unset: { draft: 1 } }); },
  async defer(id, token, status, nextAttemptAt, issues) { await CatalogSaveJob.updateOne({ _id: id, status: 'processing', leaseToken: token }, { $set: { status, nextAttemptAt, issues: issues.slice(0, 50), leaseToken: '', leaseUntil: new Date(0) } }); },
};

/** Internal/admin maintenance hook, not an unauthenticated HTTP endpoint. */
export async function retryCatalogJob(id: string): Promise<boolean> {
  return (await CatalogSaveJob.updateOne({ _id: id, status: { $in: ['failed', 'needs-enrichment', 'retry'] } }, { $set: { status: 'pending', attempts: 0, nextAttemptAt: new Date(), leaseToken: '', leaseUntil: new Date(0) } })).matchedCount === 1;
}
