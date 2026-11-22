import { MovieSearchTotal } from '../models.js';
import { rankedMovieStages } from './movie-ranking.pipeline.js';

/** Existing lifetime ranking, displayed under the user-selected monthly heading. */
export async function topSearchedMovies() {
  return MovieSearchTotal.aggregate([
    { $match: { count: { $gt: 0 } } }, { $sort: { count: -1, _id: 1 } },
    ...rankedMovieStages(),
  ]);
}
