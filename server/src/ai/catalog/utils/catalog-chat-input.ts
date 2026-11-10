import { createHash } from 'node:crypto';
import type { MovieSearchResult } from '../../types/movie-search.types.js';
import type { CatalogChatInput } from '../types/catalog-job.types.js';
import { isPublicHttpsUrl } from '../validators/catalog.validator.js';

export function isCatalogEligible(movie?: MovieSearchResult | null): boolean {
  return !!movie && !movie.catalogId && !movie.linksOnly && movie.confidence !== 'low' && ['high', 'medium'].includes(movie.confidence) &&
    typeof movie.title === 'string' && !!movie.title.trim() && movie.title.length <= 200 &&
    (movie.year === null || Number.isInteger(movie.year) && movie.year >= 1880 && movie.year <= new Date().getUTCFullYear() + 5) &&
    Array.isArray(movie.sources) && (movie.identitySources ?? movie.sources).some(source => isPublicHttpsUrl(source.url));
}
export function catalogJobId(conversationId: string, requestId: string): string {
  return createHash('sha256').update(JSON.stringify(['catalog-v1', conversationId, requestId])).digest('hex');
}
export function catalogChatInput(movie: MovieSearchResult, portraits: Array<{ label: string; imageUrl: string; sourceUrl: string | null; kind?: string }>): CatalogChatInput {
  const { title, titleUz, titleRu, year, confidence, sources, identitySources, posters, details, trailer, uzbekLinks, language } = movie;
  return { movie: structuredClone({ title, titleUz, titleRu, year, confidence, sources, identitySources, posters, details, trailer, uzbekLinks, language }), language: movie.language ?? 'uz',
    actorImages: portraits.filter(image => image.kind === 'actor' && isPublicHttpsUrl(image.imageUrl))
      .slice(0, 5).map(({ label, imageUrl, sourceUrl }) => ({ label, imageUrl, sourceUrl: sourceUrl && isPublicHttpsUrl(sourceUrl) ? sourceUrl : null })) };
}
