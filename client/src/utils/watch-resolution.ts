import { verifiedEmbed } from './watch-provider';

/** Bound headers and JSON reading; release timers and listeners on every exit. */
export async function resolveWatchSource(apiBase: string, url: string, signal: AbortSignal, timeout = 12_000) {
  if (signal.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(`${apiBase}/api/watch-embed?url=${encodeURIComponent(url)}`, { signal: controller.signal });
    if (!response.ok || controller.signal.aborted) return null;
    const data = await response.json();
    return !controller.signal.aborted && typeof data.source?.embedUrl === 'string' ? verifiedEmbed(url, data.source.embedUrl) : null;
  } catch { return null; }
  finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
