import { Movie } from '../models/Movie.js';

export async function getAllMovies() {
  return Movie.find().sort({ id: 1 }).lean();
}

export async function getMovieById(id: number) {
  return Movie.findOne({ id }).lean();
}

export async function upsertMovies(movies: Record<string, unknown>[]) {
  const results = [];
  for (const movie of movies) {
    const id = Number(movie.id);
    const doc = await Movie.findOneAndUpdate(
      { id },
      { $set: movie },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
