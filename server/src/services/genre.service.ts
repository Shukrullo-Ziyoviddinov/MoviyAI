import { Genre } from '../models/Genre.js';

export async function getAllGenres() {
  return Genre.find().sort({ name: 1 }).lean();
}

export async function upsertGenres(genres: { name: string }[]) {
  const results = [];
  for (const genre of genres) {
    const name = String(genre.name ?? '').trim();
    if (!name) continue;
    const doc = await Genre.findOneAndUpdate(
      { name },
      { $set: { name } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
