import { Movie } from '../../models/Movie.js';
import { MOVIE_SECTIONS, type ListingQuery, type ListingRepository, type ListingCard } from '../types/movie-listing.types.js';

// Inclusion projection prevents future private fields from entering card responses.
export const LISTING_CARD_FIELDS = { _id: 0, id: 1, categoryName: 1, title: 1, homeImgPoster: 1, ratingImdb: 1, ratingKinopoisk: 1, 'catalogIdentity.originalTitle': 1 } as const;
export function listingFilter(query: ListingQuery) {
  return {
    categoryName: query.categoryName === 'otherMovies' ? { $nin: [...MOVIE_SECTIONS] } : query.categoryName,
    id: { $gt: query.afterId ?? 0 },
  };
}
export const movieListingRepository: ListingRepository = {
  async read(query) {
    return Movie.find(listingFilter(query)).select(LISTING_CARD_FIELDS).sort({ id: 1 }).limit(query.limit + 1).lean() as unknown as Promise<ListingCard[]>;
  },
};
