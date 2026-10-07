import {
  rankMoviesByTitleSearch,
  type SearchableMovie,
} from '../algorithms/searchMovies.js';
import { Movie } from '../models/Movie.js';

export async function searchMoviesByTitle(query: string, limit = 20) {
  const movies = (await Movie.find()
    .select({
      id: 1,
      title: 1,
      homeImgPoster: 1,
      ratingImdb: 1,
      'specs.year': 1,
    })
    .lean()) as SearchableMovie[];

  return rankMoviesByTitleSearch(query, movies, limit);
}
