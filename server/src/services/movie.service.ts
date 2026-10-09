import { Movie } from '../models/Movie.js';

export async function getAllMovies() {
  return Movie.find().sort({ id: 1 }).lean();
}

export async function getMovieById(id: number) {
  return Movie.findOne({ id }).lean();
}

export async function createMovie(input: Record<string, unknown>) {
  const last = await Movie.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const lastId = typeof last?.id === 'number' ? last.id : 8000;
  const doc = await Movie.create({ ...input, id: lastId + 1 });
  return doc.toObject();
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
          typeCategory: 1,
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
