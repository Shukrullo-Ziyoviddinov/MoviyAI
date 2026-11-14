export function watchOptions(movie: { watchUrl?: string | null; watchUrls?: string[] | null }) {
  const seen = new Set<string>();
  return [...(movie.watchUrls ?? []), movie.watchUrl].flatMap(value => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return [];
      url.hash = '';
      if (seen.has(url.href)) return [];
      seen.add(url.href);
      return [{ url: url.href, domain: url.hostname.replace(/^www\./, '') }];
    } catch { return []; }
  });
}
