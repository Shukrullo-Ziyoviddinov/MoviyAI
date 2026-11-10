import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchMovieCandidates, matchActorCandidates, createCatalogMatcher, inspectCatalogDuplicates, movieIdentityForInsert, actorIdentityForInsert } from '../dist/ai/catalog/services/catalog-match.service.js';
import { catalogNameKey, identityIds } from '../dist/ai/catalog/utils/catalog-identity.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { Movie } from '../dist/models/Movie.js';
import { Actor } from '../dist/models/Actor.js';

const filmSource = { title: 'Film', url: 'https://www.imdb.com/title/tt0816692/' };
const personSource = { title: 'Person', url: 'https://www.imdb.com/name/nm0000190/' };
const biographySource = { title: 'Biography', url: 'https://example.com/biography' };
function film(overrides = {}) { return { originalTitle: 'Interstellar', aliases: [], year: 2014, imdbId: null, kinopoiskId: null, sources: [filmSource], ...overrides }; }
function person(overrides = {}) { return { name: 'Alex Smith', originalName: 'Alex Smith', imdbId: null, kinopoiskId: null, sources: [personSource], ...overrides }; }
const birth = value => ({ value, sources: [biographySource] });
const storedFilm = { id: 8001, title: { uz: 'Interstellar', ru: 'Other localized title' }, specs: { year: 2014 } };

test('film exact external ID wins over translated spelling but conflicting IDs/years block reuse', () => {
  const input = film({ imdbId: 'tt0816692' });
  const record = { ...storedFilm, title: { uz: 'Localized title' }, catalogIdentity: { imdbId: input.imdbId } };
  assert.deepEqual(matchMovieCandidates(input, [record]), { status: 'existing', id: 8001, method: 'external-id' });
  assert.equal(matchMovieCandidates({ ...input, year: 2015 }, [record]).status, 'conflict');
  const both = film({ imdbId: input.imdbId, kinopoiskId: '258687', sources: [filmSource, { title: 'KP', url: 'https://www.kinopoisk.ru/film/258687/' }] });
  assert.equal(matchMovieCandidates(both, [{ ...record, catalogIdentity: { imdbId: input.imdbId, kinopoiskId: '9999' } }]).status, 'conflict');
  assert.equal(matchMovieCandidates(both, [record, { ...storedFilm, id: 8002, catalogIdentity: { kinopoiskId: '258687' } }]).status, 'conflict');
});

test('legacy film matching normalizes typography, preserves sequel digits and distinguishes remakes by year', () => {
  const record = { ...storedFilm, title: { uz: "O‘rgimchak—odam 2" }, specs: { year: 2004 } };
  assert.equal(matchMovieCandidates(film({ originalTitle: "O'rgimchak odam 2", year: 2004 }), [record]).status, 'existing');
  assert.equal(matchMovieCandidates(film({ originalTitle: "O'rgimchak odam 3", year: 2004 }), [record]).status, 'not-found');
  assert.equal(matchMovieCandidates(film({ year: 2024 }), [storedFilm]).status, 'not-found');
  assert.equal(matchMovieCandidates(film({ year: null }), [storedFilm]).status, 'needs-research');
  assert.equal(matchMovieCandidates(film(), [storedFilm, { ...storedFilm, id: 8002 }]).status, 'needs-research');
  assert.equal(matchMovieCandidates(film({ directors: ['Christopher Nolan'] }), [{ ...storedFilm, description: { uz: { director: 'Someone Else' } } }]).status, 'needs-research');
});

test('film aliases with conflicting known external identity are not silently merged', () => {
  assert.equal(matchMovieCandidates(film({ imdbId: 'tt0816692' }), [{ ...storedFilm, catalogIdentity: { imdbId: 'tt9999999' } }]).status, 'conflict');
  assert.equal(matchMovieCandidates(film({ sources: [filmSource, { title: 'Different film', url: 'https://www.imdb.com/title/tt9999999/' }] }), [storedFilm]).status, 'needs-research');
});

test('only official entity pages support external IDs; film pages cannot identify a person', async () => {
  assert.deepEqual(identityIds([filmSource], 'actor'), { imdbId: null, kinopoiskId: null });
  assert.deepEqual(identityIds([personSource], 'actor'), { imdbId: 'nm0000190', kinopoiskId: null });
  assert.deepEqual(identityIds([{ title: 'Spoof', url: 'https://imdb.com.evil.example/name/nm0000190/' }], 'actor'), { imdbId: null, kinopoiskId: null });
  let reads = 0;
  const matcher = createCatalogMatcher({ findMovies: async () => { reads++; return { records: [], truncated: false }; }, findActors: async () => { reads++; return { records: [], truncated: false }; } });
  assert.equal((await matcher.actor(person({ imdbId: 'nm0000190', sources: [filmSource] }))).status, 'needs-research');
  assert.equal((await matcher.movie(film({ imdbId: 'tt9999999' }))).status, 'needs-research');
  assert.equal(reads, 0);
});

test('same actor name alone cannot reuse an ID or authorize a new actor', () => {
  const row = { id: 9001, actorName: 'Alex Smith' };
  assert.equal(matchActorCandidates(person(), [row]).status, 'needs-research');
  assert.equal(matchActorCandidates(person(), []).status, 'needs-research');
  assert.equal(matchActorCandidates(person({ imdbId: 'nm0000190' }), [row]).status, 'needs-research');
  assert.equal(matchActorCandidates(person({ imdbId: 'nm0000190' }), []).status, 'not-found');
});

test('person ID selects the right namesake, while contradictory date or provider blocks reuse', () => {
  const rows = [
    { id: 9001, actorName: 'Alex Smith', catalogIdentity: { imdbId: 'nm0000190', birthDate: '1970-01-01' } },
    { id: 9002, actorName: 'Alex Smith', catalogIdentity: { imdbId: 'nm9999999', birthDate: '1980-01-01' } },
  ];
  assert.deepEqual(matchActorCandidates(person({ imdbId: 'nm0000190' }), rows), { status: 'existing', id: 9001, method: 'external-id' });
  assert.equal(matchActorCandidates(person({ imdbId: 'nm0000190', birthDate: birth('1980-01-01') }), rows).status, 'conflict');
  assert.equal(matchActorCandidates(person({ imdbId: 'nm0000190' }), [rows[0], { ...rows[0], id: 9003 }]).status, 'conflict');
});

test('verified full birth date distinguishes namesakes; incomplete, unsourced or invalid dates do not', () => {
  const rows = [{ id: 9001, actorName: 'Alex Smith', catalogIdentity: { birthDate: '1970-01-01' } }, { id: 9002, actorName: 'Alex Smith', catalogIdentity: { birthDate: '1980-01-01' } }];
  assert.deepEqual(matchActorCandidates(person({ birthDate: birth('1980-01-01') }), rows), { status: 'existing', id: 9002, method: 'name-birth-date' });
  assert.equal(matchActorCandidates(person({ birthDate: birth('1980-01-01') }), [...rows, { id: 9003, actorName: 'Alex Smith' }]).status, 'needs-research');
  for (const date of ['1980', '1980-02-30', '2999-01-01']) assert.equal(matchActorCandidates(person({ birthDate: birth(date) }), rows).status, 'needs-research');
  assert.equal(matchActorCandidates(person({ birthDate: { value: '1980-01-01', sources: [] } }), rows).status, 'needs-research');
});

test('bounded candidate results and repository errors never turn into false not-found decisions', async () => {
  const matcher = createCatalogMatcher({ findMovies: async () => ({ records: [], truncated: true }), findActors: async () => { throw Error('DB unavailable'); } });
  assert.equal((await matcher.movie(film())).status, 'needs-research');
  await assert.rejects(() => matcher.actor(person({ imdbId: 'nm0000190' })), /DB unavailable/);
});

function draft() {
  return prepareCatalogDraft({ title: 'Interstellar', titleUz: 'Interstellar', titleRu: null, year: 2014, confidence: 'high', sources: [filmSource], posters: [] }, { language: 'uz' });
}
test('an existing film skips actor processing and never mutates the draft or database', async () => {
  let actorReads = 0; const input = draft(), before = structuredClone(input);
  const result = await inspectCatalogDuplicates(input, { movie: async () => ({ status: 'existing', id: 8001, method: 'external-id' }), actor: async () => { actorReads++; throw Error('must not run'); } });
  assert.equal(result.movie.id, 8001); assert.equal(actorReads, 0); assert.deepEqual(input, before);
});

test('only confirmed existing actor IDs populate the new movie actorIds array', async () => {
  const input = draft();
  input.actors = ['First', 'Second', 'Third'].map(actorName => ({ actorName, originalName: actorName, existingId: null, identity: { imdbId: null, kinopoiskId: null, birthDate: null }, actorImg: null, actorAbout: { uz: null, ru: null }, role: null, sources: [personSource] }));
  const result = await inspectCatalogDuplicates(input, { movie: async () => ({ status: 'not-found', method: 'checked-candidates' }), actor: async actor => actor.name === 'First' ? { status: 'existing', id: 9001, method: 'external-id' } : { status: 'needs-research', reason: 'Uncertain', candidateIds: [] } });
  assert.deepEqual(result.draft.movie.actorIds, [9001]); assert.equal(result.draft.actors[0].existingId, 9001); assert.equal(result.draft.actors[1].existingId, null); assert.deepEqual(input.movie.actorIds, []);
});

test('identity metadata has normalized keys and optional unique provider indexes without changing legacy requirements', async () => {
  assert.equal(catalogNameKey('  José—Smith  II '), 'jose smith ii');
  const movieIdentity = movieIdentityForInsert(film({ imdbId: 'tt0816692' })); assert.equal(movieIdentity.imdbId, 'tt0816692'); assert.deepEqual(movieIdentity.nameKeys, ['interstellar']);
  const actorIdentity = actorIdentityForInsert(person({ imdbId: 'nm0000190' })); assert.equal(actorIdentity.imdbId, 'nm0000190');
  assert.throws(() => actorIdentityForInsert(person()), /UNVERIFIED_ACTOR_IDENTITY/);
  const legacy = new Actor({ id: 9001, actorName: 'Alex Smith', actorImg: '/img/actor.png', actorAbout: { uz: 'Bio', ru: 'Bio' } }); await legacy.validate(); assert.equal(legacy.catalogIdentity, undefined);
  const current = new Actor({ ...legacy.toObject(), catalogIdentity: actorIdentity }); await current.validate(); assert.equal(current.catalogIdentity.imdbId, 'nm0000190');
  for (const model of [Movie, Actor]) {
    for (const key of ['catalogIdentity.imdbId', 'catalogIdentity.kinopoiskId']) {
      const index = model.schema.indexes().find(([fields]) => fields[key] === 1); assert.ok(index[1].unique); assert.deepEqual(index[1].partialFilterExpression[key], { $type: 'string' });
    }
  }
});
