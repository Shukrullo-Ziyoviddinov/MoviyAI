import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCatalogReferences, validateCatalogReferenceValues, createCatalogReferenceResolver } from '../dist/ai/catalog/services/catalog-reference.service.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { emptyDossier } from '../dist/ai/services/movie-dossier.js';

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
// Keep the original small dictionary fixture for missing/ambiguous cases.
const snapshot = { genres: read('genre').slice(0,12), countries: read('country').filter(row=>['India','USA'].includes(row.name)) };
const source = { title: 'Film production facts', url: 'https://example.com/film' };
function draft(genres = ['Science fiction', 'Drama'], countries = ['United States']) {
  const details = emptyDossier(); details.genres = { value: genres, sources: [source] }; details.countries = { value: countries, sources: [source] };
  return prepareCatalogDraft({ title: 'Example', titleUz: 'Example', titleRu: null, year: 2014, confidence: 'high', sources: [source], posters: [], details }, { language: 'en' });
}

test('English, Uzbek and Russian facts resolve to the exact current DB labels, including existing spelling', () => {
  for (const [genres, countries] of [[['Science fiction', 'Drama'], ['United States']], [['Fantastika', 'Drama'], ['AQSh']], [['Фантастика', 'Драма'], ['США']]]) {
    const result = resolveCatalogReferences(draft(genres, countries), snapshot);
    assert.equal(result.ready, true); assert.equal(result.draft.movie.categoryName, 'sciFiMovies');
    assert.deepEqual(result.draft.movie.genre, { uz: ['Fantastika', 'Dramma'], ru: ['Фантастика', 'Драма'] });
    assert.deepEqual(result.draft.movie.filterGenre, ['Fantastika', 'Dramma']); assert.equal(result.draft.movie.filterCountry, 'USA');
    assert.deepEqual(result.draft.movie.specs.countries, ['USA']); assert.deepEqual(validateCatalogReferenceValues(result.draft.movie, snapshot), []);
  }
});

test('aliases deduplicate without losing source order; primary country is not hardcoded to USA', () => {
  const input = draft(['Drama', 'Dramma', 'Драма'], ['Hindiston', 'India', 'AQSH', 'United States']);
  const before = structuredClone(input); const result = resolveCatalogReferences(input, snapshot);
  assert.equal(result.ready, true); assert.deepEqual(result.references.countries, ['India', 'USA']); assert.equal(result.references.primaryCountry, 'India');
  assert.deepEqual(result.references.genres, [{ name: 'Dramma', nameRu: 'Драма' }]); assert.deepEqual(input, before);
  assert.deepEqual(result.draft.research, before.research);
});

test('all stored country fields reuse dictionary spelling instead of model translations', () => {
  const input = draft(['Drama'], ['United States', 'Hindiston']);
  input.movie.description.uz.country = 'AI country translation';
  input.movie.description.ru.country = 'Another spelling';
  const result = resolveCatalogReferences(input, snapshot);
  assert.equal(result.ready, true);
  assert.equal(result.draft.movie.filterCountry, 'USA');
  assert.deepEqual(result.draft.movie.specs.countries, ['USA', 'India']);
  assert.equal(result.draft.movie.description.uz.country, 'USA, India');
  assert.equal(result.draft.movie.description.ru.country, 'USA, India');
  assert.equal(input.movie.description.uz.country, 'AI country translation');
});

test('missing genre or production country blocks the whole mapping instead of publishing partial filters', () => {
  const input = draft(['Drama', 'Crime'], ['United States', 'United Kingdom']);
  input.movie.categoryName = 'actionMovies'; input.movie.filterCountry = 'USA'; input.movie.genre = { uz: ['Dramma'], ru: ['Драма'] };
  const result = resolveCatalogReferences(input, snapshot);
  assert.equal(result.ready, false); assert.equal(result.references, null);
  assert.ok(result.issues.some(issue => issue.value === 'Crime' && issue.kind === 'missing'));
  assert.ok(result.issues.some(issue => issue.value === 'United Kingdom' && issue.kind === 'missing'));
  assert.deepEqual(result.draft.movie.genre, { uz: [], ru: [] }); assert.equal(result.draft.movie.filterCountry, null); assert.equal(result.draft.movie.categoryName, null);
});

test('updated dictionary rows are used dynamically; multilingual countries do not need new hardcoded output strings', () => {
  const updated = structuredClone(snapshot); updated.countries.push({ name: 'United Kingdom' }); updated.genres.push({ name: 'Kriminal', nameRu: 'Криминал' });
  const result = resolveCatalogReferences(draft(['Comedy', 'Crime'], ['Buyuk Britaniya']), updated);
  assert.equal(result.ready, true); assert.equal(result.draft.movie.filterCountry, 'United Kingdom');
  assert.deepEqual(result.draft.movie.genre.uz, ['Komediya', 'Kriminal']);
  assert.equal(resolveCatalogReferences(draft(['Comedy', 'Crime'], ['Buyuk Britaniya']), snapshot).ready, false);
});

test('ambiguous aliases and incomplete dictionary translations never select an arbitrary row', () => {
  const duplicate = structuredClone(snapshot); duplicate.genres.push({ name: 'Drama', nameRu: 'Драма' });
  assert.ok(resolveCatalogReferences(draft(['Драма']), duplicate).issues.some(issue => issue.kind === 'ambiguous'));
  const countries = structuredClone(snapshot); countries.countries.push({ name: 'United States' });
  assert.ok(resolveCatalogReferences(draft(['Drama'], ['AQSh']), countries).issues.some(issue => issue.kind === 'ambiguous'));
  const incomplete = structuredClone(snapshot); incomplete.genres.find(row => row.name === 'Dramma').nameRu = '';
  assert.ok(resolveCatalogReferences(draft(['Drama']), incomplete).issues.some(issue => issue.kind === 'invalid-dictionary'));
});

test('different concepts stay distinct: fantasy is not science fiction, USSR is not Russia, Korea is ambiguous', () => {
  assert.equal(resolveCatalogReferences(draft(['Fantasy']), snapshot).ready, false);
  const countries = { ...snapshot, countries: [{ name: 'Russia' }, { name: 'South Korea' }] };
  for (const value of ['USSR', 'Korea', 'North Korea']) assert.ok(resolveCatalogReferences(draft(['Drama'], [value]), countries).issues.some(issue => issue.kind === 'missing' && issue.value === value));
});

test('category follows explicit multi-genre precedence; unsupported categories have no broad default', () => {
  assert.equal(resolveCatalogReferences(draft(['Family', 'Comedy', 'Animation']), snapshot).draft.movie.categoryName, 'animationMovies');
  assert.equal(resolveCatalogReferences(draft(['Comedy', 'Horror']), snapshot).draft.movie.categoryName, 'horrorMovies');
  assert.equal(resolveCatalogReferences(draft(['Thriller']), snapshot).draft.movie.categoryName, 'actionMovies');
});

test('every supported dictionary genre has an explicit existing category and preserves its own labels', () => {
  const full = { genres: read('genre'), countries: read('country') };
  for (const genre of full.genres) {
    const result = resolveCatalogReferences(draft([genre.name]), full);
    assert.equal(result.ready, true, genre.name);
    assert.deepEqual(result.draft.movie.genre, {uz:[genre.name],ru:[genre.nameRu]});
    assert.deepEqual(validateCatalogReferenceValues(result.draft.movie,full),[]);
  }
  const fantasy = resolveCatalogReferences(draft(['Fantasy','Detective']),full);
  assert.equal(fantasy.draft.movie.categoryName,'sciFiMovies');
  assert.deepEqual(fantasy.draft.movie.genre.uz,['Fentezi','Detektiv']);
});

test('unsourced genres/countries are research issues; a DB error cannot fall back to seed JSON', async () => {
  const input = draft(); input.research.details.genres.sources = []; input.research.details.countries.sources = [];
  const result = resolveCatalogReferences(input, snapshot); assert.equal(result.ready, false); assert.equal(result.issues.filter(issue => issue.kind === 'unverified').length, 2);
  let reads = 0; const resolver = createCatalogReferenceResolver({ load: async () => { reads++; throw Error('DB unavailable'); } });
  await assert.rejects(() => resolver.resolve(draft()), /DB unavailable/); assert.equal(reads, 1);
});

test('fresh membership validation rejects removed rows, mismatched translations and unrelated active categories', () => {
  const movie = resolveCatalogReferences(draft(), snapshot).draft.movie;
  const removed = { ...snapshot, countries: [] }; assert.ok(validateCatalogReferenceValues(movie, removed).some(issue => issue.path === 'specs.countries.0'));
  const altered = structuredClone(movie); altered.genre.ru[0] = 'Wrong genre'; altered.filterGenre = ['Invented']; altered.categoryName = 'horrorMovies';
  const paths = validateCatalogReferenceValues(altered, snapshot).map(issue => issue.path);
  for (const path of ['genre.uz.0', 'filterGenre', 'categoryName']) assert.ok(paths.includes(path));
});
