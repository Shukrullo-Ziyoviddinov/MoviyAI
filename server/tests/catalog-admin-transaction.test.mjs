import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
function code(name) { return readFileSync(new URL(`../dist/services/${name}.service.js`, import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/\bexport /g, ''); }
const session = { testSession: true };
function query(value) { return { session(input) { assert.equal(input, session); return this; }, async lean() { return value; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }

test('country rename/delete update both canonical country fields in the shared transaction', async () => {
  const updates = []; let transactions = 0;
  const current = { _id: 'country', name: 'USA', async save(options) { assert.equal(options.session, session); } };
  const Country = { findById: () => query(current), findOne: () => query(null), findByIdAndDelete: (_id, options) => { assert.equal(options.session, session); return query(current); } };
  const Movie = { updateMany: async (filter, patch, options) => { assert.equal(options.session, session); updates.push({ filter, patch }); } };
  const api = new Function('Country', 'Movie', 'withCatalogTransaction', code('country') + '\nreturn {updateCountry,deleteCountry};')(Country, Movie, async work => { transactions++; return work(session); });
  await api.updateCountry('country', 'United States');
  assert.ok(updates.some(row => row.patch.$set?.filterCountry === 'United States'));
  assert.ok(updates.some(row => row.patch.$set?.['specs.countries.$[item]'] === 'United States'));
  updates.length = 0; await api.deleteCountry('country');
  assert.ok(updates.some(row => row.patch.$pull?.['specs.countries'] === 'United States')); assert.equal(transactions, 2);
});

test('genre rename/delete keep the paired genre labels and filter updates on one transaction session', async () => {
  const updates = []; const current = { _id: 'genre', name: 'Drama', nameRu: 'Old RU', async save(options) { assert.equal(options.session, session); } };
  const Genre = { findById: () => query(current), findOne: () => query(null), findByIdAndDelete: (_id, options) => { assert.equal(options.session, session); return query(current); } };
  const Movie = { updateMany: async (filter, patch, options) => { assert.equal(options.session, session); updates.push({ filter, patch }); } };
  const api = new Function('Genre', 'Movie', 'withCatalogTransaction', code('genre') + '\nreturn {updateGenre,deleteGenre};')(Genre, Movie, work => work(session));
  await api.updateGenre('genre', 'Dramma', 'New RU');
  for (const path of ['filterGenre.$[item]', 'genre.uz.$[item]', 'genre.ru.$[item]']) assert.ok(updates.some(row => row.patch.$set?.[path]));
  updates.length = 0; await api.deleteGenre('genre'); assert.equal(updates.length, 3);
});

test('admin movie and actor creation use the same allocator and override supplied numeric IDs', async () => {
  for (const [name, modelName, exported, expected] of [['movie', 'Movie', 'createMovie', 8051], ['actor', 'Actor', 'createActor', 9011]]) {
    const model = { create: async (rows, options) => { assert.equal(options.session, session); return [{ toObject: () => rows[0] }]; } };
    const api = new Function(modelName, 'withCatalogTransaction', 'allocateCatalogId', code(name) + `\nreturn ${exported};`)(model, work => work(session), async (kind, input) => { assert.equal(kind, name); assert.equal(input, session); return expected; });
    assert.equal((await api({ id: 999999 })).id, expected);
  }
});
