import { randomUUID } from 'node:crypto';
import { catalogJobRepository } from '../repositories/catalog-job.repository.js';
import { catalogDispatcher } from './catalog-dispatch.service.js';
import { processCatalogChatSave } from './catalog-chat-save.service.js';
import type { CatalogJobProcessor, CatalogJobRepository } from '../types/catalog-job.types.js';
import { catalogFailureDetails, catalogOperation } from '../utils/catalog-diagnostics.js';
import {runActorBackfillOnce} from './catalog-actor-backfill.service.js';

const LEASE_MS = 10 * 60 * 1000;
export function createCatalogWorker(deps: { jobs: CatalogJobRepository; dispatch: () => Promise<number>; process: CatalogJobProcessor; now: () => Date } = {
  jobs: catalogJobRepository, dispatch: () => catalogDispatcher.dispatch(), process: processCatalogChatSave, now: () => new Date(),
}) {
  let running = false;
  return { async runOnce(): Promise<void> {
    if (running) return;
    running = true;
    try {
      // Enqueue failure must not prevent already-durable jobs from progressing.
      try { await deps.dispatch(); } catch { console.warn('[AI_CATALOG] Outbox dispatch will retry'); }
      const token = randomUUID(), now = deps.now();
      const job = await deps.jobs.claim(now, token, new Date(now.getTime() + LEASE_MS));
      if (!job) return;
      console.info('[AI_CATALOG]', {event:'started',jobId:job.id,attempt:job.attempts});
      const controller = new AbortController();
      const heartbeat = setInterval(() => {
        void deps.jobs.renew(job.id, token, new Date(deps.now().getTime() + LEASE_MS)).then(renewed => { if (!renewed) controller.abort(); }).catch(() => controller.abort());
      }, 30000);
      heartbeat.unref();
      try {
        const result = await deps.process(job.input, job.draft, controller.signal, async draft => {
          controller.signal.throwIfAborted();
          if (!await catalogOperation({provider:'mongodb',stage:'checkpoint'},()=>deps.jobs.checkpoint(job.id, token, draft))) { controller.abort(); throw new Error('CATALOG_LEASE_LOST'); }
        });
        controller.signal.throwIfAborted();
        if (result.status === 'created' || result.status === 'existing') {
          await deps.jobs.complete(job.id, token, result.movieId);
          console.info('[AI_CATALOG]', { event: result.status, jobId:job.id, movieId: result.movieId });
        } else {
          await deps.jobs.defer(job.id, token, job.attempts>=5?'failed':'needs-enrichment', new Date(deps.now().getTime() + Math.min(3600000,60000*2**Math.max(0,job.attempts-1))), result.issues);
          console.info('[AI_CATALOG]', { event: 'needs-enrichment', jobId:job.id, fields: result.issues.map(issue => issue.path).slice(0, 20) });
        }
      } catch (error) {
        const failure = catalogFailureDetails(error);
        const status = job.attempts >= 5 ? 'failed' : 'retry';
        await deps.jobs.defer(job.id, token, status, new Date(deps.now().getTime() + Math.min(3600000, 30000 * 2 ** Math.max(0, job.attempts - 1))),
          [{ path: 'catalogSave', action: 'research', blocking: true, message: `Operation failed: provider=${failure.provider}, stage=${failure.stage ?? 'unknown'}, status=${failure.providerStatus ?? 'unknown'}, kind=${failure.errorKind}. Retry from the saved checkpoint.` }]);
        console.warn('[AI_CATALOG]', { event: status, jobId:job.id, attempt: job.attempts, ...failure });
      } finally { clearInterval(heartbeat); }
    } catch { console.warn('[AI_CATALOG] Worker unavailable; durable tasks will retry'); }
    finally { running = false; }
  } };
}
const worker = createCatalogWorker();
let scheduled = false;
let timer: ReturnType<typeof setInterval> | undefined;
export function wakeCatalogWorker(): void {
  if (scheduled) return;
  scheduled = true;
  setImmediate(() => { scheduled = false; void worker.runOnce(); void runActorBackfillOnce(); });
}
export function startCatalogWorker(): void {
  if (timer) return;
  timer = setInterval(wakeCatalogWorker, 15000); timer.unref(); wakeCatalogWorker();
}
export function stopCatalogWorker(): void { if (timer) clearInterval(timer); timer = undefined; }
