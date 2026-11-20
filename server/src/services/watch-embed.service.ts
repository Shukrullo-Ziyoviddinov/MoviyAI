import { watchProvider, verifiedEmbed } from '../utils/watch-provider.js';

/** Bounded HTML requests. No media proxying and no redirects to arbitrary hosts. */
async function html(url: string, signal: AbortSignal, fetcher: typeof fetch, prefix = false) {
  const response = await fetcher(url, { signal, redirect: 'error', headers: { Accept: 'text/html' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); return null; }
  const reader = response.body?.getReader(); if (!reader) return null;
  const decoder = new TextDecoder(); let text = '', bytes = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length;
    if (bytes > 600_000) { if (prefix) break; return null; } text += decoder.decode(chunk.value, { stream: true });
  } } finally { await reader.cancel().catch(() => {}); }
  return { text, headers: response.headers };
}

export async function resolveWatchEmbed(value: string, fetcher: typeof fetch = fetch) {
  const source = watchProvider(value); if (!source) return null;
  const signal = AbortSignal.timeout(10_000);
  try {
    const page = await html(source.url, signal, fetcher, true).catch(() => null);
    // Use the provider's exported URL. OK documents the deterministic videoembed route.
    const candidates: string[] = page?.text.replace(/\\\//g, '/').replace(/&amp;/g, '&').match(/https:\/\/[^\s"'<>\\]+/g) ?? [];
    if (source.provider === 'ok') candidates.push(`https://ok.ru/videoembed/${source.id}`);
    if (source.provider === 'vk') candidates.push(`https://vkvideo.ru/video_ext.php?oid=${source.owner}&id=${source.id}`);
    for (const candidate of candidates.slice(0, 500)) {
      const embedUrl = verifiedEmbed(source.url, candidate); if (!embedUrl) continue;
      const embed = await html(embedUrl, signal, fetcher); if (!embed) continue;
      if (embed.headers.has('x-frame-options') || /frame-ancestors/i.test(embed.headers.get('content-security-policy') ?? '')) continue;
      if (!/player|<video|videoembed/i.test(embed.text) || /video (?:has been removed|is private|not found|is unavailable)|Видео (?:удалено|недоступно)|is_unavailable["']?\s*:\s*true/i.test(embed.text)) continue;
      return { url: source.url, provider: source.provider, embedUrl };
    }
  } catch { /* Unavailable/private/blocked pages remain external links. */ }
  return null;
}

const cache = new Map<string, { expires: number; value: Awaited<ReturnType<typeof resolveWatchEmbed>> }>();
const pending = new Map<string, ReturnType<typeof resolveWatchEmbed>>();
export async function cachedWatchEmbed(value: string) {
  const source = watchProvider(value); if (!source) return null;
  const existing = cache.get(source.url); if (existing && existing.expires > Date.now()) return existing.value;
  const running = pending.get(source.url); if (running) return running;
  if (pending.size >= 8) return null;
  const work = resolveWatchEmbed(source.url).then(result => {
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(source.url, { expires: Date.now() + (result ? 120_000 : 15_000), value: result }); return result;
  }).finally(() => pending.delete(source.url));
  pending.set(source.url, work); return work;
}
