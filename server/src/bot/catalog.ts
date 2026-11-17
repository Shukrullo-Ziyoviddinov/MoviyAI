import { CatalogSaveJob } from '../ai/catalog/models/catalog-job.model.js';
import { catalogChatInput, isCatalogEligible } from '../ai/catalog/utils/catalog-chat-input.js';
import { saveCatalogWatchLinks } from '../ai/catalog/services/catalog-watch-links.service.js';
import { wakeCatalogWorker } from '../ai/catalog/services/catalog-worker.service.js';
import { BotUpdate } from './models.js';
import type { BotResult } from './ai.js';

let running = false;
export async function drainBotCatalog() {
  if (running) return;
  running = true;
  try {
    const jobs = await BotUpdate.find({ catalogPending: true, catalogNextAttemptAt: { $lte: new Date() } }).sort({ createdAt: 1 }).limit(5).lean();
    for (const job of jobs) {
      try {
        const result = job.result as BotResult | null;
        if (!result) continue;
        const items = result.recommendations?.length ? result.recommendations : result.movie ? [{ movie: result.movie, characterImages: result.characterImages }] : [];
        for (const [index, item] of items.entries()) {
          if (!isCatalogEligible(item.movie)) continue;
          try {
            await CatalogSaveJob.updateOne({ _id: `telegram-${job._id}-${index}` }, { $setOnInsert: {
              input: catalogChatInput(item.movie, item.characterImages ?? []), status: 'pending', attempts: 0, nextAttemptAt: new Date(),
            } }, { upsert: true });
          } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
        }
        if (result.movie?.linksOnly) await saveCatalogWatchLinks(result.movie);
        await BotUpdate.updateOne({ _id: job._id }, { $set: { catalogPending: false } });
        try { wakeCatalogWorker(); } catch { /* Catalog jobs are already durable. */ }
      } catch {
        const attempts = (job.catalogAttempts ?? 0) + 1;
        await BotUpdate.updateOne({ _id: job._id }, { $set: {
          catalogAttempts: attempts, catalogNextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(attempts - 1, 7))),
        } });
        console.warn('[TELEGRAM_CATALOG]', { event: 'retry-scheduled' });
      }
    }
  } catch { console.warn('[TELEGRAM_CATALOG]', { event: 'queue-deferred' }); }
  finally { running = false; }
}
