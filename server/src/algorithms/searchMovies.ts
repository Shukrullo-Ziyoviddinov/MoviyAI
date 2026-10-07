export type SearchableMovie = {
  id: number;
  title?: { uz?: string; ru?: string } | null;
  homeImgPoster?: string;
  ratingImdb?: number;
  specs?: { year?: number } | null;
  [key: string]: unknown;
};

export type RankedSearchMovie = {
  id: number;
  title: { uz: string; ru: string };
  homeImgPoster: string;
  ratingImdb: number;
  year: number;
  searchScore: number;
};

const MIN_QUERY_LEN = 1;
const FUZZY_THRESHOLD = 0.86;
const DEFAULT_LIMIT = 20;

/** Lowercase, strip apostrophes/diacritics-ish, collapse spaces, ё→е */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´ʻʼʹ′]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/** Classic Jaro similarity */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i += 1) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }

  if (!matches) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i += 1) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k += 1;
    if (s1[i] !== s2[k]) t += 1;
    k += 1;
  }

  const m = matches;
  return (m / s1.length + m / s2.length + (m - t / 2) / m) / 3;
}

/** Jaro–Winkler with standard p=0.1, prefix ≤ 4 */
export function jaroWinkler(s1: string, s2: string): number {
  const j = jaro(s1, s2);
  if (j === 0) return 0;

  let prefix = 0;
  const maxPrefix = Math.min(4, s1.length, s2.length);
  while (prefix < maxPrefix && s1[prefix] === s2[prefix]) prefix += 1;

  return j + prefix * 0.1 * (1 - j);
}

function scoreTitle(query: string, queryTokens: string[], titleRaw: string): number {
  const title = normalizeSearchText(titleRaw);
  if (!title || !query) return 0;

  if (title === query) return 100;
  if (title.startsWith(query)) return 85;

  const titleTokens = tokenize(title);
  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => titleTokens.some((t) => t.startsWith(token) || t.includes(token)))
  ) {
    return 70;
  }

  if (title.includes(query)) return 55;

  const fullJw = jaroWinkler(query, title);
  if (fullJw >= FUZZY_THRESHOLD) {
    return Math.round(40 + (fullJw - FUZZY_THRESHOLD) * (35 / (1 - FUZZY_THRESHOLD)));
  }

  // Best token-level fuzzy (short typos on individual words)
  let bestTokenJw = 0;
  for (const qToken of queryTokens) {
    if (qToken.length < 2) continue;
    for (const tToken of titleTokens) {
      const jw = jaroWinkler(qToken, tToken);
      if (jw > bestTokenJw) bestTokenJw = jw;
    }
  }
  if (bestTokenJw >= FUZZY_THRESHOLD) {
    return Math.round(40 + (bestTokenJw - FUZZY_THRESHOLD) * (30 / (1 - FUZZY_THRESHOLD)));
  }

  return 0;
}

/**
 * Weighted title search over uz/ru titles.
 * Rank: searchScore DESC, then ratingImdb DESC. Empty / short query → [].
 */
export function rankMoviesByTitleSearch(
  queryRaw: string,
  movies: SearchableMovie[],
  limit = DEFAULT_LIMIT
): RankedSearchMovie[] {
  const query = normalizeSearchText(queryRaw);
  if (query.length < MIN_QUERY_LEN) return [];

  const queryTokens = tokenize(query);
  const capped = Math.max(1, Math.min(40, Math.floor(limit) || DEFAULT_LIMIT));

  const ranked: RankedSearchMovie[] = [];

  for (const movie of movies) {
    const titleUz = String(movie.title?.uz ?? '');
    const titleRu = String(movie.title?.ru ?? '');
    const score = Math.max(
      scoreTitle(query, queryTokens, titleUz),
      scoreTitle(query, queryTokens, titleRu)
    );
    if (score <= 0) continue;

    ranked.push({
      id: Number(movie.id),
      title: { uz: titleUz, ru: titleRu },
      homeImgPoster: String(movie.homeImgPoster ?? ''),
      ratingImdb: Number(movie.ratingImdb ?? 0) || 0,
      year: Number(movie.specs?.year ?? 0) || 0,
      searchScore: score,
    });
  }

  ranked.sort((a, b) => {
    if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
    if (b.ratingImdb !== a.ratingImdb) return b.ratingImdb - a.ratingImdb;
    return a.id - b.id;
  });

  return ranked.slice(0, capped);
}
