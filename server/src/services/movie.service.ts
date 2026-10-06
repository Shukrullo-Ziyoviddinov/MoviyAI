import { Movie } from '../models/Movie.js';

export async function getAllMovies() {
  return Movie.find().sort({ id: 1 }).lean();
}

export async function getMovieById(id: number) {
  return Movie.findOne({ id }).lean();
}

export async function getMoviesByActorId(actorId: number) {
  return Movie.find({ actorIds: actorId }).sort({ id: 1 }).lean();
}

export async function upsertMovies(movies: Record<string, unknown>[]) {
  const results = [];
  for (const movie of movies) {
    const id = Number(movie.id);
    const doc = await Movie.findOneAndUpdate(
      { id },
      {
        $set: movie,
        $unset: {
          movieDetailPoster: 1,
          trailersVideo: 1,
          homeImgPosterRu: 1,
          'description.uz.descriptionImg': 1,
          'description.ru.descriptionImg': 1,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
