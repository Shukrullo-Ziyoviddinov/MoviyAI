import type { MovieSection } from '../types/movie-listing.types.js';

export function invalidListing(message: string): never {
  throw Object.assign(new Error(message), { status: 400 });
}
export function encodeListingCursor(category: MovieSection, id: number): string {
  return Buffer.from(JSON.stringify({ v: 1, category, id })).toString('base64url');
}
/** Versioned and section-bound. A cursor is a position, never a database query. */
export function decodeListingCursor(value: unknown, category: MovieSection): number {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(value)) return invalidListing('Invalid cursor');
  try {
    const raw = Buffer.from(value, 'base64url');
    if (raw.toString('base64url') !== value) return invalidListing('Invalid cursor');
    const parsed = JSON.parse(raw.toString('utf8'));
    if (parsed?.v !== 1 || parsed.category !== category || !Number.isSafeInteger(parsed.id) || parsed.id <= 0 || Object.keys(parsed).length !== 3)
      return invalidListing('Invalid cursor');
    return parsed.id;
  } catch { return invalidListing('Invalid cursor'); }
}
