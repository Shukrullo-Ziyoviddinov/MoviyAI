import { z } from 'zod';

import type { MovieSource, MovieFact, MovieDetails } from '../types/movie-dossier.types.js';
const indexes = z.array(z.number().int().min(0)).max(4);
const fact = <T extends z.ZodType>(value: T) => z.object({ value: value.nullable(), sourceIndexes: indexes });
export const dossierSchema = z.object({
  productionYears: fact(z.string().max(150)), countries: fact(z.array(z.string().max(80)).max(8)),
  genres: fact(z.array(z.string().max(80)).max(8)), runtimeMinutes: fact(z.number().int().min(1).max(1500)),
  ageRating: fact(z.string().max(80)), synopsis: fact(z.string().max(2400)),
  directors: fact(z.array(z.string().max(120)).max(5)), budget: fact(z.string().max(180)), boxOffice: fact(z.string().max(180)),
  writers: fact(z.array(z.string().max(120)).max(8)).optional(), premiere: fact(z.string().max(180)).optional(),
  imdb: fact(z.number().min(0).max(10)), kinopoisk: fact(z.number().min(0).max(10)),
  cast: z.array(z.object({ name: z.string().max(120), role: z.string().max(160).nullable(), sourceIndexes: indexes })).max(5),
});
export function verifiedDossier(raw: z.infer<typeof dossierSchema>, sources: MovieSource[]): MovieDetails {
  const refs = (ids: number[], domain?: string) => [...new Set(ids)].filter(index => {
    if (!sources[index]) return false;
    if (!domain) return true;
    const url = new URL(sources[index].url);
    return (url.hostname === domain || url.hostname.endsWith('.' + domain)) &&
      (domain === 'imdb.com' ? /^\/title\/tt\d+/.test(url.pathname) : /^\/(film|series)\/\d+/.test(url.pathname));
  }).map(index => ({ title: sources[index].title, url: sources[index].url }));
  function verified<T>(item: { value: T | null; sourceIndexes: number[] }, domain?: string): MovieFact<T> {
    const evidence = refs(item.sourceIndexes, domain);
    const value = item.value;
    return evidence.length && value !== null && (typeof value !== 'string' || value.trim()) && (!Array.isArray(value) || value.length)
      ? { value, sources: evidence } : { value: null, sources: [] };
  }
  function rating(item: {value: number | null; sourceIndexes: number[]}, domain: string) {
    if (item.value === null) return { value: null, sources: [] };
    const number = String(item.value).replace('.', '[.,]');
    const explicitScore = new RegExp(`(?:rating|рейтинг|оценка)\\D{0,24}${number}(?!\\d)|\\b${number}\\s*(?:/|из|out of)\\s*10\\b`, 'i');
    return verified({ ...item, sourceIndexes: item.sourceIndexes.filter(index=>sources[index] && explicitScore.test(sources[index].title + ' ' + (sources[index].snippet ?? ''))) }, domain);
  }
  return {
    productionYears: verified(raw.productionYears), countries: verified(raw.countries), genres: verified(raw.genres),
    runtimeMinutes: verified(raw.runtimeMinutes), ageRating: verified(raw.ageRating), synopsis: verified(raw.synopsis),
    directors: verified(raw.directors), budget: verified(raw.budget), boxOffice: verified(raw.boxOffice),
    writers: verified(raw.writers ?? {value:null,sourceIndexes:[]}),
    premiere: verified(raw.premiere?.value && /^\d{4}$/.test(raw.premiere.value.trim()) ? {value:null,sourceIndexes:[]} : raw.premiere ?? {value:null,sourceIndexes:[]}),
    imdb: rating(raw.imdb, 'imdb.com'), kinopoisk: rating(raw.kinopoisk, 'kinopoisk.ru'),
    cast: raw.cast.filter(actor=>actor.name.trim() && refs(actor.sourceIndexes).length)
      .filter((actor,index,all)=>all.findIndex(other=>other.name.toLowerCase()===actor.name.toLowerCase())===index)
      .map(actor=>({ name: actor.name, role: actor.role, sources: refs(actor.sourceIndexes) })),
    checkedAt: new Date().toISOString(),
  };
}
export function emptyDossier(): MovieDetails {
  const missing = { value: null, sourceIndexes: [] };
  return verifiedDossier({ productionYears: missing, countries: missing, genres: missing, runtimeMinutes: missing,
    ageRating: missing, synopsis: missing, directors: missing, budget: missing, boxOffice: missing,
    imdb: missing, kinopoisk: missing, cast: [] }, []);
}
const labels = {
  uz: { names: 'Kino nomlari', original: 'Original nomi', uz: 'O‘zbekcha nomi', ru: 'Ruscha nomi', info: 'Kino haqida', year: 'Chiqarilgan yil', productionYears: 'Ishlab chiqarilgan davri', countries: 'Davlatlar', genres: 'Janrlar', runtimeMinutes: 'Davomiyligi', ageRating: 'Yosh chegarasi', synopsis: 'Mazmuni — spoylerlarsiz', directors: 'Rejissyor', cast: 'Asosiy aktyorlar', money: 'Budjet va kassa tushumi', budget: 'Budjet', boxOffice: 'Dunyo bo‘yicha kassa tushumi', ratings: 'Reytinglar', checked: 'Qidiruvda tekshirilgan sana', unknown: 'Ishonchli manbada topilmadi', minute: 'daq.', confirm: 'Siz izlagan kino shumi?', uncertain: 'Bu taxminiy moslik. Tasdiqlash uchun kadrni solishtiring.' },
  ru: { names: 'Названия фильма', original: 'Оригинальное название', uz: 'Название на узбекском', ru: 'Название на русском', info: 'О фильме', year: 'Год выхода', productionYears: 'Период производства', countries: 'Страны', genres: 'Жанры', runtimeMinutes: 'Продолжительность', ageRating: 'Возрастное ограничение', synopsis: 'Сюжет — без спойлеров', directors: 'Режиссёр', cast: 'Главные актёры', money: 'Бюджет и сборы', budget: 'Бюджет', boxOffice: 'Мировые кассовые сборы', ratings: 'Рейтинги', checked: 'Дата проверки в поиске', unknown: 'Не найдено в надёжных источниках', minute: 'мин.', confirm: 'Это тот фильм, который вы искали?', uncertain: 'Это предварительное совпадение. Сравните найденный фильм с кадром.' },
  en: { names: 'Film titles', original: 'Original title', uz: 'Uzbek title', ru: 'Russian title', info: 'About the film', year: 'Release year', productionYears: 'Production period', countries: 'Countries', genres: 'Genres', runtimeMinutes: 'Runtime', ageRating: 'Age rating', synopsis: 'Plot — without spoilers', directors: 'Director', cast: 'Main cast', money: 'Budget and box office', budget: 'Budget', boxOffice: 'Worldwide box office', ratings: 'Ratings', checked: 'Search checked on', unknown: 'Not found in reliable sources', minute: 'min.', confirm: 'Is this the film you were looking for?', uncertain: 'This is a tentative match. Compare the film with your frame.' },
};
export function renderMovieDossier(movie: { title: string; titleUz: string | null; titleRu: string | null; year: number | null; confidence: string; sources: MovieSource[] }, details: MovieDetails, language: 'uz' | 'ru' | 'en', tablePresentation = false) {
  const l = labels[language];
  const clean = (value: string) => value.replace(/[\[\]<>`*#]/g, '').trim();
  const citations = (refs: MovieSource[]) => refs.map(source => `[${Math.max(1, movie.sources.findIndex(item=>item.url===source.url)+1)}](${source.url.replace(/\(/g, '%28').replace(/\)/g, '%29')})`).join(' ');
  const field = (label: string, item: MovieFact<string | number | string[]>, suffix = '') =>
    `- **${label}:** ${item.value === null ? l.unknown : clean(Array.isArray(item.value) ? item.value.join(', ') : String(item.value)) + suffix} ${citations(item.sources)}`.trim();
  if (tablePresentation) return [
    movie.confidence === 'medium' ? l.uncertain : '',
    details.synopsis.value ? `### ${l.synopsis}\n\n${clean(details.synopsis.value)} ${citations(details.synopsis.sources)}` : '',
    details.cast.length ? `### ${l.cast}\n\n` + details.cast.map((actor,index)=>`${index+1}. **${clean(actor.name)}**${actor.role ? ` — ${clean(actor.role)}` : ''} ${citations(actor.sources)}`).join('\n') : '',
    l.confirm,
  ].filter(Boolean).join('\n\n');
  return [
    `## ${clean(movie.title)}${movie.year ? ` (${movie.year})` : ''}`,
    movie.confidence === 'medium' ? l.uncertain : '',
    `### ${l.names}`,
    `- **${l.original}:** ${clean(movie.title)}`,
    `- **${l.uz}:** ${movie.titleUz ? clean(movie.titleUz) : l.unknown}`,
    `- **${l.ru}:** ${movie.titleRu ? clean(movie.titleRu) : l.unknown}`,
    `### ${l.info}`,
    `- **${l.year}:** ${movie.year ?? l.unknown}`,
    field(l.productionYears, details.productionYears), field(l.countries, details.countries), field(l.genres, details.genres),
    field(l.runtimeMinutes, details.runtimeMinutes, ` ${l.minute}`), field(l.ageRating, details.ageRating),
    `### ${l.synopsis}`, details.synopsis.value ? `${clean(details.synopsis.value)} ${citations(details.synopsis.sources)}` : l.unknown,
    `### ${l.directors}`, field(l.directors, details.directors),
    `### ${l.cast}`,
    details.cast.length ? details.cast.map((actor,index)=>`${index+1}. **${clean(actor.name)}**${actor.role ? ` — ${clean(actor.role)}` : ''} ${citations(actor.sources)}`).join('\n') : l.unknown,
    `### ${l.money}`, field(l.budget, details.budget), field(l.boxOffice, details.boxOffice),
    `### ${l.ratings}`, field('IMDb', details.imdb, ' / 10'), field('Kinopoisk', details.kinopoisk, ' / 10'),
    `${l.checked}: ${details.checkedAt.slice(0,10)}`, l.confirm,
  ].filter(Boolean).join('\n\n');
}
