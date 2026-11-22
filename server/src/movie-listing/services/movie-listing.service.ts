import { movieListingRepository } from '../repositories/movie-listing.repository.js';
import { MOVIE_SECTIONS, type ListingPage, type ListingQuery, type ListingRepository, type MovieSection } from '../types/movie-listing.types.js';
import { encodeListingCursor } from '../utils/movie-listing-cursor.js';

export function createMovieListingService(repository: ListingRepository = movieListingRepository) {
  async function page(query: ListingQuery): Promise<ListingPage> {
    const rows = await repository.read(query);
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return { items, hasMore, nextCursor: hasMore ? encodeListingCursor(query.categoryName, items[items.length - 1].id) : null };
  }
  return {
    page,
    async home() {
      const sections: MovieSection[] = [...MOVIE_SECTIONS, 'otherMovies'];
      const results = await Promise.all(sections.map(async categoryName => {
        const result = await page({ categoryName, limit: 7, afterId: null });
        return { categoryName, movies: result.items, hasMore: result.hasMore };
      }));
      return results.filter(section => section.movies.length > 0);
    },
  };
}
export const movieListingService = createMovieListingService();
