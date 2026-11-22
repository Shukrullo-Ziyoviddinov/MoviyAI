export const MOVIE_SECTIONS = ['actionMovies', 'horrorMovies', 'animationMovies', 'romanceMovies', 'dramaMovies', 'comedyMovies', 'familyMovies', 'sciFiMovies'] as const;
export type MovieSection = typeof MOVIE_SECTIONS[number] | 'otherMovies';
export interface ListingCard {
  id: number;
  categoryName: string | null;
  title: { uz: string | null; ru: string | null };
  homeImgPoster: string | null;
  ratingImdb: number | null;
  ratingKinopoisk: number | null;
  catalogIdentity?: { originalTitle?: string };
}
export interface ListingQuery { categoryName: MovieSection; limit: number; afterId: number | null }
export interface ListingPage { items: ListingCard[]; nextCursor: string | null; hasMore: boolean }
export interface ListingRepository { read(query: ListingQuery): Promise<ListingCard[]> }
