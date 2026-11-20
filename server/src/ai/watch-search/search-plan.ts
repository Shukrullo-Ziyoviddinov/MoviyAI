export const WATCH_SITES = ['vkvideo.ru', 'ok.ru', 'mover.uz'] as const;
export type WatchSite = typeof WATCH_SITES[number];
export type WatchFilm = { title: string; titleUz: string | null; titleRu: string | null; year: number | null };

export function watchSearchNames(film: WatchFilm) {
  const clean = (name: string) => name.replace(/\s+(?:premyera|uzbek\s+tilida|o.zbekcha|full\s+hd|skachat)\b[\s\S]*$/iu, '').replace(/["<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  return [...new Set([film.titleUz, film.title, film.titleRu].filter((value): value is string => !!value).map(clean).filter(Boolean))];
}

/** A shortened local title is a search hypothesis only; it never becomes a saved film title. */
export function internalSearchNames(film: WatchFilm) {
  const names = watchSearchNames(film), local = names[0];
  const short = film.titleUz && local?.split(' ').length >= 3 ? local.split(' ')[0] : null;
  return [...new Set((short ? [short, film.title] : names).filter((name): name is string => !!name))].slice(0, 2);
}

export function providerSearchUrl(site: WatchSite, name: string, year: number | null) {
  const query = `${name} ${year ?? ''}`.trim();
  if (site === 'ok.ru') return `https://ok.ru/video/search/${encodeURIComponent(query).replace(/%20/g, '+')}`;
  if (site === 'mover.uz') return `https://mover.uz/search?val=${encodeURIComponent(query)}`;
  return `https://vkvideo.ru/video?q=${encodeURIComponent(query)}`;
}
