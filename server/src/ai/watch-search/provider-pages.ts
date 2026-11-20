import { watchProvider } from '../../utils/watch-provider.js';
import { providerSearchUrl, type WatchSite } from './search-plan.js';

export type WatchCandidate = { title: string; url: string; site: string; snippet: string };
type HtmlResult = { status: 'ok'; html: string } | { status: 'blocked' | 'unavailable' };
export function cleanProviderText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ' ';
  }).replace(/&(?:amp|quot|apos|nbsp);/gi, entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' }[entity.toLowerCase()] ?? ' ')).replace(/\s+/g, ' ').trim();
}

/** Only caller-constructed provider URLs reach this reader. Never follow login redirects. */
async function readHtml(url: string, signal: AbortSignal, fetcher: typeof fetch): Promise<HtmlResult> {
  try {
    const response = await fetcher(url, { redirect: 'manual', signal, headers: { Accept: 'text/html' } });
    if ([301, 302, 303, 307, 308, 401, 403, 429].includes(response.status)) { await response.body?.cancel(); return { status: 'blocked' }; }
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); return { status: 'unavailable' }; }
    const reader = response.body?.getReader(); if (!reader) return { status: 'unavailable' };
    const decoder = new TextDecoder(); let html = '', size = 0;
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break;
      const remaining = 750_000 - size; html += decoder.decode(chunk.value.subarray(0, remaining), { stream: true }); size += chunk.value.length;
      if (size >= 750_000) break;
    } } finally { await reader.cancel().catch(() => {}); }
    if (/captcha|access denied|sign in to continue/i.test(cleanProviderText(html.slice(0, 1500)))) return { status: 'blocked' };
    return { status: 'ok', html };
  } catch { return { status: 'unavailable' }; }
}

export async function readWatchPage(value: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const source = watchProvider(value); if (!source) return null;
  const result = await readHtml(source.url, signal, fetcher); if (result.status !== 'ok') return null;
  const { html } = result; const metadata: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content) metadata[key.toLowerCase()] = cleanProviderText(content);
  }
  const title = metadata['og:title'] || cleanProviderText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const duration = Number(metadata['og:video:duration'] || metadata['video:duration']) || null;
  const description = metadata['og:description'] || metadata.description || '';
  const content = html.split(/<recommendations-block\b/i)[0];
  const text = cleanProviderText(content.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, '')).slice(0, 6500);
  return { title, duration, description, text };
}

export async function searchProviderVideos(site: WatchSite, name: string, year: number | null, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const address = providerSearchUrl(site, name, year);
  const result = await readHtml(address, signal, fetcher);
  if (result.status !== 'ok') return { status: result.status, candidates: [] as WatchCandidate[] };
  const tokens = name.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const candidates = new Map<string, WatchCandidate & { score: number }>();
  for (const match of result.html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    try {
      const source = watchProvider(new URL(match[2].replace(/&amp;/g, '&'), address).href);
      if (!source || new URL(source.url).hostname !== site) continue;
      const title = cleanProviderText(match[4]) || cleanProviderText((match[1] + match[3]).match(/title\s*=\s*["']([^"']+)/i)?.[1] ?? '');
      const score = tokens.filter(token => title.toLocaleLowerCase().includes(token)).length;
      if (!score || (candidates.get(source.url)?.score ?? -1) >= score) continue;
      candidates.set(source.url, { title, url: source.url, site, snippet: `Provider search heading: ${title}`, score });
    } catch { /* Untrusted/malformed result URLs are not fetched. */ }
  }
  return { status: 'ok' as const, candidates: [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 4).map(({ score: _score, ...candidate }) => candidate) };
}
