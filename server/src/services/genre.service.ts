import { Genre } from '../models/Genre.js';
import { Movie } from '../models/Movie.js';

export async function getAllGenres() {
  return Genre.find().sort({ name: 1 }).lean();
}

export async function upsertGenres(genres: { name: string; nameRu?: string }[]) {
  const results = [];
  for (const genre of genres) {
    const name = String(genre.name ?? '').trim();
    if (!name) continue;
    const nameRu = String(genre.nameRu ?? '').trim();
    const doc = await Genre.findOneAndUpdate(
      { name },
      { $set: nameRu ? { name, nameRu } : { name } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}

export async function createGenre(name: string) {
  const existing = await Genre.findOne({ name }).lean();
  if (existing) {
    const error = new Error('Bu janr allaqachon bor');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  return Genre.create({ name });
}

export async function updateGenre(id: string, name: string) {
  const current = await Genre.findById(id);
  if (!current) return null;
  if (current.name === name) return current;

  const clash = await Genre.findOne({ name, _id: { $ne: current._id } }).lean();
  if (clash) {
    const error = new Error('Bu janr allaqachon bor');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  const previous = current.name;
  current.name = name;
  await current.save();
  await Movie.updateMany(
    { filterGenre: previous },
    { $set: { 'filterGenre.$[item]': name } },
    { arrayFilters: [{ item: previous }] }
  );
  return current;
}

export async function deleteGenre(id: string) {
  const current = await Genre.findByIdAndDelete(id).lean();
  if (!current) return null;
  await Movie.updateMany({ filterGenre: current.name }, { $pull: { filterGenre: current.name } });
  return current;
}
