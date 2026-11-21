import { Movie } from '../models/Movie.js';
import { catalogMatcher } from '../ai/catalog/services/catalog-match.service.js';
import { dispatchSearchEvents, pendingSearchEvents, resolveSearchEvent, deferSearchEvent, type SearchEvent } from './repository.js';

export function createPopularityWorker(deps = {
  dispatch: dispatchSearchEvents, pending: pendingSearchEvents, resolve: resolveSearchEvent, defer: deferSearchEvent,
  async match(event: SearchEvent): Promise<number | null> {
    if (event.catalogId && await Movie.exists({ id: event.catalogId })) return event.catalogId;
    const match = await catalogMatcher.movie(event.identity);
    return match.status === 'existing' ? match.id : null;
  },
}) {
  let running = false;
  return { async runOnce() {
    if (running) return;
    running = true;
    try {
      try { await deps.dispatch(); } catch { console.warn('[MOVIE_POPULARITY] Outbox transfer will retry'); }
      for (const event of await deps.pending()) {
        try {
          const id = await deps.match(event);
          if (id) await deps.resolve(event.id, id);
          else await deps.defer(event);
        } catch { await deps.defer(event); }
      }
    } catch { console.warn('[MOVIE_POPULARITY] Counting will retry'); }
    finally { running = false; }
  } };
}
const worker = createPopularityWorker();
let timer: ReturnType<typeof setInterval> | undefined;
export function startPopularityWorker() {
  if (timer) return;
  timer = setInterval(() => { void worker.runOnce(); }, 15000);
  timer.unref();
  void worker.runOnce();
}
