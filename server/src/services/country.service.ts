import { Country } from '../models/Country.js';
import { Movie } from '../models/Movie.js';

export async function getAllCountries() {
  return Country.find().sort({ name: 1 }).lean();
}

export async function upsertCountries(countries: { name: string }[]) {
  const results = [];
  for (const country of countries) {
    const name = String(country.name ?? '').trim();
    if (!name) continue;
    const doc = await Country.findOneAndUpdate(
      { name },
      { $set: { name } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}

export async function createCountry(name: string) {
  const existing = await Country.findOne({ name }).lean();
  if (existing) {
    const error = new Error('Bu davlat allaqachon bor');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  return Country.create({ name });
}

export async function updateCountry(id: string, name: string) {
  const current = await Country.findById(id);
  if (!current) return null;
  if (current.name === name) return current;

  const clash = await Country.findOne({ name, _id: { $ne: current._id } }).lean();
  if (clash) {
    const error = new Error('Bu davlat allaqachon bor');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  const previous = current.name;
  current.name = name;
  await current.save();
  await Movie.updateMany({ filterCountry: previous }, { $set: { filterCountry: name } });
  return current;
}

export async function deleteCountry(id: string) {
  const current = await Country.findByIdAndDelete(id).lean();
  if (!current) return null;
  await Movie.updateMany({ filterCountry: current.name }, { $set: { filterCountry: '' } });
  return current;
}
