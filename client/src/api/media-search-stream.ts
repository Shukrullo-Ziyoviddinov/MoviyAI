import type { MovieSearchResult } from '../types/chat';
import type { ChatStage } from '../types/chat-progress';

export async function readMediaSearchStream(response: Pick<Response, 'ok' | 'body'> & { status?: number }, progress: (stage: ChatStage) => void): Promise<MovieSearchResult> {
  if (!response.ok || !response.body) throw Object.assign(new Error('Search unavailable'), { failureCode: response.status === 429 ? 'rate_limited' : 'unknown' });
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', result: MovieSearchResult | undefined;
  const stages = new Set(['checking_video','analyzing_video','analyzing_image','verifying','catalog','searching','uzbek_links','posters','preparing']);
  const line = (value: string) => {
    if (!value.startsWith('data: ')) return;
    const event = JSON.parse(value.slice(6));
    if (event.type === 'progress' && stages.has(event.stage)) progress(event.stage);
    if (event.type === 'error') throw Object.assign(new Error('Media search failed'), { failureCode: event.code });
    if (event.type === 'done' && typeof event.movie?.title === 'string' && Array.isArray(event.movie.posters) && Array.isArray(event.movie.uzbekLinks)) result = event.movie;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 1_000_000) throw new Error('Search response too large');
      const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
      for (const item of lines) line(item.trimEnd());
      if (done) break;
    }
    if (buffer) line(buffer.trimEnd());
    if (!result) throw new Error('Search interrupted');
    return result;
  } finally { if (!result) await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
