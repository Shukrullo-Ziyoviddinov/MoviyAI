import { videoImportCleanupRepository, type CleanupImport } from '../repositories/video-import-cleanup.repository.js';
import { videoImportStorage } from './video-import-storage.service.js';
import { abortVideoImport } from './video-import-controls.service.js';
import { cleanupAbandonedVideoWorkspaces } from './video-workspace.service.js';
import { cleanupRetryDelay, cleanupErrorInfo } from '../../utils/cleanup-retry.js';
import { ChatFailure } from '../../types/chat-progress.types.js';

const defaults = { repository: videoImportCleanupRepository, storage: videoImportStorage, abort: abortVideoImport, cleanLocal: cleanupAbandonedVideoWorkspaces, now: () => new Date() };
export function createVideoImportCleanup(deps = defaults) {
  async function purge(row: CleanupImport) {
    const now = deps.now();
    if (row.deletedAt && row.cleanupNextAt && row.cleanupNextAt > now) return false;
    try {
      const marked = await deps.repository.mark(row, now);
      if (!marked) return true;
      deps.abort(row._id, new ChatFailure('stopped'));
      if (marked.cleanupNotBefore && marked.cleanupNotBefore > now) {
        await deps.repository.defer(marked, marked.cleanupNotBefore, marked.cleanupAttempts ?? 0, true); return false;
      }
      const keys = [...new Set([marked.r2Key, ...(marked.reservedKeys ?? [])].filter((key): key is string => !!key))];
      for (const key of keys) if (!key.startsWith(`videoimport/${row._id}/`) || !/^videoimport\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp4$/.test(key)) throw Error('INVALID_IMPORT_CLEANUP_KEY');
      for (const key of keys) await deps.storage.remove(key, AbortSignal.timeout(20000));
      await deps.repository.complete(marked, now);
      return true;
    } catch (error) {
      const attempts = (row.cleanupAttempts ?? 0) + 1, delayMs = cleanupRetryDelay(attempts);
      await deps.repository.defer(row, new Date(now.getTime() + delayMs), attempts, true);
      console.warn('[VIDEO_IMPORT_CLEANUP]', { event: 'retry-scheduled', attempt: attempts, delayMs, ...cleanupErrorInfo(error) });
      return false;
    }
  }
  return {
    async conversation(userId: string, id: string) {
      if (!await deps.repository.deletedConversation(userId, id)) return false;
      const rows = await deps.repository.candidates(deps.now(), { userId, id });
      let done = true;
      for (const row of rows) if (!await purge(row)) done = false;
      if (done && rows.length) done = !(await deps.repository.candidates(deps.now(), { userId, id })).length;
      return done;
    },
    async runOnce() {
      const now = deps.now();
      for (const row of await deps.repository.candidates(now)) {
        if (await deps.repository.shouldDelete(row, now)) await purge(row);
        else await deps.repository.defer(row, new Date(now.getTime() + 3600000), 0, false);
      }
      await deps.repository.removeFinishedResults(now);
      await deps.cleanLocal(now);
    },
  };
}
export const videoImportCleanup = createVideoImportCleanup();
let timer: ReturnType<typeof setInterval> | undefined, running = false;
export function startVideoImportCleanup() {
  if (timer) return;
  const run = async () => {
    if (running) return; running = true;
    try { await videoImportCleanup.runOnce(); }
    catch (error) { console.warn('[VIDEO_IMPORT_CLEANUP]', { event: 'scan-deferred', ...cleanupErrorInfo(error) }); }
    finally { running = false; }
  };
  timer = setInterval(() => { void run(); }, 60000); timer.unref(); void run();
}
