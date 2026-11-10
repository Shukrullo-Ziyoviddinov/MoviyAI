import { Movie } from '../../models/Movie.js';
import { Actor } from '../../models/Actor.js';
import { env } from '../../config/env.js';
import { catalogNameKeys } from '../catalog/utils/catalog-identity.js';
import { emptyDossier } from './movie-dossier.js';
import { youtubeVideoId } from './movie-trailer.service.js';
import type { MovieSearchResult } from '../types/movie-search.types.js';

/** Only exact names are candidates. Gemini must still verify the uploaded frame. */
export async function findCatalogChatCandidates(titles: string[], year: number | null, language: 'uz'|'ru'|'en') {
  const keys = catalogNameKeys(titles);
  if (!keys.length) return [];
  const rows = await Movie.find({ $or: [
    { 'catalogIdentity.nameKeys': { $in: keys } },
    { 'catalogIdentity.nameKeys': { $exists: false }, ...(year ? { 'specs.year': year } : {}) },
  ] }).select('+catalogResearch').limit(101).lean();
  // A truncated legacy candidate set is not evidence that a title is absent.
  if (rows.length > 100) return [];
  const matches = rows.filter(row => row.specs && row.description?.uz && row.description?.ru && (!year || row.specs.year === year) &&
    catalogNameKeys([row.title.uz, row.title.ru, row.catalogIdentity?.originalTitle]).some(key => keys.includes(key))).slice(0, 5);
  return Promise.all(matches.map(async row => {
    const actors = await Actor.find({ id: { $in: row.actorIds } }).lean();
    const saved = row.catalogResearch?.result as MovieSearchResult | undefined;
    const locale = language === 'ru' ? 'ru' : 'uz';
    const description = row.description![locale];
    const details = structuredClone(saved?.details ?? emptyDossier());
    const fact = <T>(value: T) => ({ value, sources: [] });
    details.synopsis = fact(description.text);
    details.countries = fact(row.specs!.countries);
    details.genres = fact(row.genre?.[locale] ?? []);
    details.directors = fact([description.director]);
    details.runtimeMinutes = fact(row.specs!.duration);
    details.ageRating = fact(row.specs!.ageRating);
    details.imdb = fact(row.ratingImdb || null);
    details.kinopoisk = fact(row.ratingKinopoisk || null);
    const orderedActors = row.actorIds.flatMap(id => {
      const actor = actors.find(actor => actor.id === id);
      return actor ? [actor] : [];
    }).slice(0, 5);
    details.cast = orderedActors.map(actor => {
      const previous = saved?.details?.cast.find(item => catalogNameKeys([item.name, item.originalName]).includes(catalogNameKeys([actor.actorName])[0]));
      return { name: actor.actorName, originalName: actor.catalogIdentity?.originalName ?? undefined, role: previous?.role ?? null, sources: previous?.sources ?? [] };
    });
    const media = (path: string, folder: string) => /^https:\/\//i.test(path) ? path : `${env.publicUrl}/api/media/${folder}/${encodeURIComponent(path.split('/').pop() ?? '')}`;
    const movie: MovieSearchResult = {
      title: row.catalogIdentity?.originalTitle ?? saved?.title ?? row.title.uz,
      titleUz: row.title.uz, titleRu: row.title.ru, year: row.specs!.year, language,
      confidence: 'high', sources: saved?.sources ?? [], identitySources: saved?.identitySources ?? [],
      posters: [...new Set([row.homeImgPoster, ...(row.catalogPosters ?? [])])].filter(Boolean).slice(0, 2).map(path => ({ url: media(path, 'movieimg'), sourceUrl: null })),
      details, trailer: null, uzbekLinks: [], catalogId: row.id,
      catalogPortraits: orderedActors.map(actor => ({ label: actor.actorName, kind: 'actor', imageUrl: media(actor.actorImg, 'actorimg'), sourceUrl: null })),
    };
    const videoId = youtubeVideoId(row.trailers);
    if (videoId) movie.trailer = { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, title: saved?.trailer?.title ?? movie.title, channel: saved?.trailer?.channel ?? null, kind: 'trailer' };
    try { const url = new URL(row.watchUrl); if (url.protocol === 'https:') movie.uzbekLinks = [{ title: row.title.uz, url: url.href, site: url.hostname }]; } catch { /* No stored watching link. */ }
    return movie;
  }));
}
