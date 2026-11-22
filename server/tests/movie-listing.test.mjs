import test from 'node:test';
import assert from 'node:assert/strict';
import { createMovieListingService } from '../dist/movie-listing/services/movie-listing.service.js';
import { parseListingQuery } from '../dist/movie-listing/validators/movie-listing.validator.js';
import { encodeListingCursor } from '../dist/movie-listing/utils/movie-listing-cursor.js';
import { movieListingRepository, LISTING_CARD_FIELDS, listingFilter } from '../dist/movie-listing/repositories/movie-listing.repository.js';
import { Movie } from '../dist/models/Movie.js';
import { MOVIE_SECTIONS } from '../dist/movie-listing/types/movie-listing.types.js';

test('listing validates section, bounded limit, cursor encoding and section binding', () => {
  assert.deepEqual(parseListingQuery('dramaMovies', {}), { categoryName: 'dramaMovies', limit: 12, afterId: null });
  const cursor = encodeListingCursor('dramaMovies', 8037);
  assert.equal(parseListingQuery('dramaMovies', { cursor, limit: '7' }).afterId, 8037);
  for (const [category, query] of [
    ['weeklyTopSearchedMovies', {}], ['topSearchedMovies', {}], ['unknown', {}],
    ['dramaMovies', { limit: '0' }], ['dramaMovies', { limit: '13' }], ['dramaMovies', { limit: ['12'] }],
    ['dramaMovies', { limit: '1.5' }], ['dramaMovies', { cursor: '' }], ['dramaMovies', { cursor: 'abc' }],
    ['dramaMovies', { cursor: encodeListingCursor('dramaMovies', -1) }],
    ['comedyMovies', { cursor }], ['dramaMovies', { cursor: `${cursor}=` }], ['dramaMovies', { sort: 'anything' }],
  ]) assert.throws(() => parseListingQuery(category, query), error => error.status === 400);
});

test('cursor pages do not repeat rows when earlier rows disappear or newer IDs are inserted', async () => {
  let rows = Array.from({ length: 26 }, (_, index) => ({ id: index + 1, categoryName: 'dramaMovies' }));
  const service = createMovieListingService({ read: async query => rows.filter(row => row.id > (query.afterId ?? 0)).slice(0, query.limit + 1) });
  const first = await service.page(parseListingQuery('dramaMovies', {}));
  assert.equal(first.items.length, 12);
  assert.equal(first.hasMore, true);
  rows = rows.filter(row => row.id > 3);
  rows.push({ id: 27, categoryName: 'dramaMovies' });
  const second = await service.page(parseListingQuery('dramaMovies', { cursor: first.nextCursor }));
  const last = await service.page(parseListingQuery('dramaMovies', { cursor: second.nextCursor }));
  assert.deepEqual(second.items.map(row => row.id), Array.from({ length: 12 }, (_, i) => i + 13));
  assert.deepEqual(last.items.map(row => row.id), [25, 26, 27]);
  assert.equal(last.hasMore, false);
  assert.equal(last.nextCursor, null);
});

test('home independently bounds every ordinary section at seven and omits empty sections', async () => {
  const calls = [];
  const service = createMovieListingService({ read: async query => {
    calls.push(query);
    return query.categoryName === 'dramaMovies' ? Array.from({ length: 8 }, (_, i) => ({ id: i + 1 })) : [];
  } });
  const home = await service.home();
  assert.equal(calls.length, MOVIE_SECTIONS.length + 1);
  assert.ok(calls.every(query => query.limit === 7 && query.afterId === null));
  assert.deepEqual(home.map(row => [row.categoryName, row.movies.length, row.hasMore]), [['dramaMovies', 7, true]]);
  assert.equal(calls.some(query => /top/i.test(query.categoryName)), false);
});

test('repository uses bounded indexed ordering and a public inclusion projection', async () => {
  const original = Movie.find;
  const calls = {};
  const query = { categoryName: 'dramaMovies', limit: 12, afterId: 8037 };
  const chain = {
    select(value) { calls.projection = value; return this; },
    sort(value) { calls.sort = value; return this; },
    limit(value) { calls.limit = value; return this; },
    async lean() { return []; },
  };
  Movie.find = filter => { calls.filter = filter; return chain; };
  try { await movieListingRepository.read(query); } finally { Movie.find = original; }
  assert.deepEqual(calls.filter, { categoryName: 'dramaMovies', id: { $gt: 8037 } });
  assert.deepEqual(calls.sort, { id: 1 });
  assert.equal(calls.limit, 13);
  assert.deepEqual(calls.projection, LISTING_CARD_FIELDS);
  assert.deepEqual(Object.keys(LISTING_CARD_FIELDS), ['_id', 'id', 'categoryName', 'title', 'homeImgPoster', 'ratingImdb', 'ratingKinopoisk', 'catalogIdentity.originalTitle']);
  assert.ok(Movie.schema.indexes().some(([keys]) => keys.categoryName === 1 && keys.id === 1));
  assert.deepEqual(listingFilter({ ...query, categoryName: 'otherMovies', afterId: null }), { categoryName: { $nin: [...MOVIE_SECTIONS] }, id: { $gt: 0 } });
});

test('empty section terminates paging and database failure is not disguised as empty success', async () => {
  assert.deepEqual(await createMovieListingService({ read: async () => [] }).page(parseListingQuery('dramaMovies', {})), { items: [], hasMore: false, nextCursor: null });
  const unavailable = createMovieListingService({ read: async () => { throw new Error('database unavailable'); } });
  await assert.rejects(unavailable.home(), /database unavailable/);
});
