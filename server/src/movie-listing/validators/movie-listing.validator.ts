import { MOVIE_SECTIONS, type ListingQuery, type MovieSection } from '../types/movie-listing.types.js';
import { decodeListingCursor, invalidListing } from '../utils/movie-listing-cursor.js';

export function parseListingQuery(category: unknown, query: Record<string, unknown>): ListingQuery {
  if (typeof category !== 'string' || ![...MOVIE_SECTIONS, 'otherMovies'].includes(category)) return invalidListing('Invalid movie section');
  if (Object.keys(query).some(key => key !== 'limit' && key !== 'cursor')) return invalidListing('Invalid listing parameter');
  const raw = query.limit;
  if (raw !== undefined && (typeof raw !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(raw))) return invalidListing('Limit must be between 1 and 12');
  const categoryName = category as MovieSection;
  return { categoryName, limit: raw === undefined ? 12 : Number(raw), afterId: query.cursor === undefined ? null : decodeListingCursor(query.cursor, categoryName) };
}
