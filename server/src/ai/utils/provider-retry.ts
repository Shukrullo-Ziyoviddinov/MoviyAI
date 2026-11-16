import {setTimeout as sleep} from 'node:timers/promises';

/** One initial request plus two bounded retries, sharing the caller's deadline. */
export const PROVIDER_RETRY_DELAYS = [2000, 5000] as const;

export async function waitForProviderRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await sleep(delayMs, undefined, {signal});
  signal.throwIfAborted();
}
