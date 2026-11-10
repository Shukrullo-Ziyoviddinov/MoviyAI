import { isPublicHttpsUrl } from '../validators/catalog.validator.js';
import type { MovieSource } from '../../types/movie-dossier.types.js';

/** Conservative: keep digits, subtitles, scripts and word order; no fuzzy/transliterated identity guesses. */
export function catalogNameKey(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[‘’ʻ`']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function catalogNameKeys(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map(catalogNameKey).filter(Boolean))];
}
export function identityIdEvidence(sources: MovieSource[], kind: 'movie' | 'actor') {
  const imdb = new Set<string>(), kinopoisk = new Set<string>();
  for (const source of sources) {
    if (!isPublicHttpsUrl(source.url)) continue;
    const url = new URL(source.url);
    const imdbPath = kind === 'movie' ? /^\/title\/(tt\d+)(?:\/|$)/ : /^\/name\/(nm\d+)(?:\/|$)/;
    const kpPath = kind === 'movie' ? /^\/film\/(\d+)(?:\/|$)/ : /^\/name\/(\d+)(?:\/|$)/;
    if (/^(?:www\.)?imdb\.com$/i.test(url.hostname)) { const match = url.pathname.match(imdbPath); if (match) imdb.add(match[1]); }
    if (/^(?:www\.)?kinopoisk\.ru$/i.test(url.hostname)) { const match = url.pathname.match(kpPath); if (match) kinopoisk.add(match[1]); }
  }
  return { ids: { imdbId: imdb.size === 1 ? [...imdb][0] : null, kinopoiskId: kinopoisk.size === 1 ? [...kinopoisk][0] : null }, conflicts: [...(imdb.size > 1 ? ['imdb'] : []), ...(kinopoisk.size > 1 ? ['kinopoisk'] : [])] };
}
export function identityIds(sources: MovieSource[], kind: 'movie' | 'actor'): { imdbId: string | null; kinopoiskId: string | null } { return identityIdEvidence(sources, kind).ids; }

export function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1800-01-01' && value <= new Date().toISOString().slice(0, 10);
}
