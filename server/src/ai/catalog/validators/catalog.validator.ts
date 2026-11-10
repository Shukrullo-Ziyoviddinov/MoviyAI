import { z } from 'zod';
import { uzbekDetailUrl } from '../../services/uzbek-movie.service.js';

import { CATALOG_CATEGORIES } from '../config/catalog-reference.config.js';
export { CATALOG_CATEGORIES } from '../config/catalog-reference.config.js';
const text = z.string().trim().min(1).max(20000);
const id = z.number().int().positive().safe();
const ids = z.array(id).refine(values => new Set(values).size === values.length, 'Duplicate IDs');
const year = z.number().int().min(1880).max(new Date().getUTCFullYear() + 5);
const duration = z.number().int().positive().max(10000);
const rating = z.number().min(0).max(10);
const pair = z.object({ uz: text, ru: text }).strict();
const description = z.object({ text, year, country: text, duration, director: text }).strict();

export function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && url.hostname.includes('.') &&
      !url.hostname.startsWith('[') && !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname) &&
      !/\.(?:localhost|local|internal)$/i.test(url.hostname);
  } catch { return false; }
}
export const publicImageCandidateSchema = z.string().refine(isPublicHttpsUrl, 'Public HTTPS URL required');

// Current catalogue uses /img/name, resolved to movieimg/ or actorimg/ by the API.
// A search-result image URL is not a stored R2 catalogue image.
const storedImage = z.string().regex(/^\/img\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp)$/i, 'Stored catalogue image path required').refine(value => !value.includes('..'), 'Invalid image filename');
const trailer = z.string().refine(value => {
  if (value === '') return true;
  try { const url = new URL(value); return url.origin === 'https://www.youtube.com' && url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') ?? '') && [...url.searchParams.keys()].every(key => key === 'v'); }
  catch { return false; }
}, 'Canonical YouTube trailer URL required');
const watchUrl = z.string().refine(value => value === '' || !!uzbekDetailUrl(value), 'Verified Uzbek movie detail page required');

export const catalogActorPayloadSchema = z.object({ actorName: text, actorImg: storedImage, actorAbout: pair }).strict();
export const catalogMoviePayloadSchema = z.object({
  categoryName: z.enum(CATALOG_CATEGORIES),
  title: pair,
  homeImgPoster: storedImage,
  ratingImdb: rating,
  ratingKinopoisk: rating,
  genre: z.object({ uz: z.array(text).min(1), ru: z.array(text).min(1) }).strict(),
  description: z.object({ uz: description, ru: description }).strict(),
  trailers: trailer,
  watchUrl,
  filterCountry: text,
  filterGenre: z.array(text).min(1),
  like: z.literal('0'),
  dislike: z.literal('0'),
  specs: z.object({ duration, ageRating: text, year, countries: z.array(text).min(1) }).strict(),
  franchiseMovieIds: ids,
  actorIds: ids.min(1),
}).strict().superRefine((movie, ctx) => {
  for (const locale of ['uz', 'ru'] as const) {
    if (movie.description[locale].year !== movie.specs.year) ctx.addIssue({ code: 'custom', path: ['description', locale, 'year'], message: 'Release year must match specs.year' });
    if (movie.description[locale].duration !== movie.specs.duration) ctx.addIssue({ code: 'custom', path: ['description', locale, 'duration'], message: 'Runtime must match specs.duration' });
  }
  if (movie.genre.uz.length !== movie.genre.ru.length) ctx.addIssue({ code: 'custom', path: ['genre'], message: 'Each genre requires both locales' });
  if (movie.filterGenre.some(value => !movie.genre.uz.includes(value))) ctx.addIssue({ code: 'custom', path: ['filterGenre'], message: 'Filters must use resolved genre names' });
  if (!movie.specs.countries.includes(movie.filterCountry)) ctx.addIssue({ code: 'custom', path: ['filterCountry'], message: 'Primary country must belong to specs.countries' });
});
