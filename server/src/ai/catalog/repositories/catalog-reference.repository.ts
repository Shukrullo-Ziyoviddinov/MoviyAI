import { Genre } from '../../../models/Genre.js';
import { Country } from '../../../models/Country.js';
import type { ClientSession } from 'mongoose';
import type { CatalogReferenceRepository } from '../types/catalog-reference.types.js';

/** MongoDB is authoritative. Seed JSON is not a fallback when the DB is unavailable. */
export function createCatalogReferenceRepository(session: ClientSession | null = null): CatalogReferenceRepository { return {
  async load() {
    const getGenres = () => Genre.find().select('name nameRu catalogAliases catalogCategory -_id').sort({ name: 1 }).session(session).lean();
    const getCountries = () => Country.find().select('name catalogAliases -_id').sort({ name: 1 }).session(session).lean();
    // The driver does not support parallel operations on a transaction session.
    const [genres, countries] = session ? [await getGenres(), await getCountries()] : await Promise.all([getGenres(), getCountries()]);
    return { genres: genres.map(row => ({ name: row.name, nameRu: row.nameRu ?? '', ...(row.catalogAliases?.length?{catalogAliases:row.catalogAliases}:{}), ...(row.catalogCategory?{catalogCategory:row.catalogCategory}:{}) })), countries: countries.map(row => ({ name: row.name, ...(row.catalogAliases?.length?{catalogAliases:row.catalogAliases}:{}) })) };
  },
}; }
export const catalogReferenceRepository = createCatalogReferenceRepository();
