import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCatalogDraft, assessCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { catalogMoviePayloadSchema, catalogActorPayloadSchema } from '../dist/ai/catalog/validators/catalog.validator.js';
import { emptyDossier } from '../dist/ai/services/movie-dossier.js';
import { Movie } from '../dist/models/Movie.js';
import { Actor } from '../dist/models/Actor.js';
import { movieMatchInput, matchMovieCandidates } from '../dist/ai/catalog/services/catalog-match.service.js';

const source = { title: 'Film evidence', url: 'https://example.com/film' };
const fact = value => ({ value, sources: [source] });
function input() {
  const details = emptyDossier();
  Object.assign(details, { runtimeMinutes: fact(169), ageRating: fact('12+ (RU)'), synopsis: fact('Film synopsis'),
    countries: fact(['United States']), directors: fact(['Christopher Nolan']), imdb: fact(8.7), kinopoisk: fact(8.6),
    cast: [{ name: 'Matthew McConaughey', originalName: 'Matthew McConaughey', role: 'Cooper', sources: [source] }] });
  return { title: 'Interstellar', titleUz: 'Interstellar', titleRu: 'Interstellar RU', year: 2014, confidence: 'high',
    sources: [source, { title: 'IMDb', url: 'https://www.imdb.com/title/tt0816692/' }, { title: 'Kinopoisk', url: 'https://www.kinopoisk.ru/film/258687/' }],
    details, posters: [{ url: 'https://example.com/poster.jpg', sourceUrl: source.url }],
    trailer: { kind: 'trailer', videoId: 'zSWdZVtXT7E', url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E', title: 'Official trailer', channel: 'Studio' },
    uzbekLinks: [{ title: 'Interstellar', url: 'https://kinochilar.com/tarjima-kinolar/9905-interstellar-uzbek-tilida.html', site: 'kinochilar.com' }] };
}
function complete() {
  const draft = prepareCatalogDraft(input(), { language: 'en',
    references: { categoryName: 'sciFiMovies', genres: [{ name: 'Fantastika', nameRu: 'Science fiction RU' }], countries: ['USA'], primaryCountry: 'USA' },
    localized: Object.fromEntries(['uz', 'ru'].map(locale => [locale, { synopsis: fact(`Synopsis ${locale}`), country: fact(`Country ${locale}`), director: fact('Christopher Nolan') }])) });
  draft.movie.homeImgPoster = '/img/interstellar-2014.jpg';
  draft.actors[0].existingId = 9001; draft.movie.actorIds = [9001];
  return draft;
}

test('preparation maps trailer and watch page to separate fields, preserving every original research fact', () => {
  const result = input(), before = structuredClone(result), draft = prepareCatalogDraft(result, { language: 'en' });
  assert.equal(draft.movie.trailers, result.trailer.url); assert.equal(draft.movie.watchUrl, result.uzbekLinks[0].url);
  assert.equal(draft.identity.imdbId, 'tt0816692'); assert.equal(draft.identity.kinopoiskId, '258687');
  assert.equal(draft.movie.homeImgPoster, null); assert.equal(draft.movie.specs.duration, 169);
  assert.equal(draft.movie.description.uz.text, null); assert.equal(draft.movie.description.ru.director, null);
  assert.equal(draft.actors[0].actorAbout.uz, null); assert.equal(draft.actors[0].existingId, null);
  assert.deepEqual(draft.research, before); assert.deepEqual(result, before);
  draft.research.details.synopsis.value = 'Changed copy'; assert.deepEqual(result, before);
});

test('unknown values never become fabricated ratings, translations, dictionary names or R2 paths', () => {
  const result = input(); result.titleRu = null; result.details.imdb = { value: 8.7, sources: [] }; result.details.kinopoisk = fact(null);
  const prepared=prepareCatalogDraft(result,{language:'en'});const report = assessCatalogDraft(prepared);
  assert.equal(report.ready, false); assert.equal(report.payload, null);
  for (const value of [prepared.movie.ratingImdb,prepared.movie.ratingKinopoisk,prepared.movie.title.ru,prepared.movie.homeImgPoster,prepared.movie.categoryName])assert.equal(value,null);
  for (const path of ['actors.0.actorImg', 'actors.0.actorAbout.uz'])
    assert.ok(report.issues.some(issue => issue.path === path && issue.blocking), path);
});

test('complete drafts produce only model-compatible fields and reuse existing actors without requesting their biographies again', async () => {
  const draft = complete(), report = assessCatalogDraft(draft);
  assert.equal(report.ready, true); assert.ok(report.payload); assert.equal(report.payload.like, '0');
  await new Movie({ ...report.payload, id: 8001 }).validate();
  assert.ok(!report.issues.some(issue => issue.path.startsWith('actors.0.actorAbout')));
  const actor = catalogActorPayloadSchema.parse({ actorName: 'An actor', actorImg: '/img/an-actor.webp', actorAbout: { uz: 'Biography UZ', ru: 'Biography RU' } });
  await new Actor({ ...actor, id: 9002 }).validate();
  assert.equal(catalogActorPayloadSchema.safeParse({ ...actor, actorImg: 'https://example.com/portrait.jpg' }).success, false);
  assert.equal(catalogMoviePayloadSchema.safeParse({ ...report.payload, id: 9999 }).success, false);
});

test('every Movie payload key is required; drifted runtime, dictionary filters and duplicate actor IDs are rejected', () => {
  const payload = assessCatalogDraft(complete()).payload;
  for (const key of Object.keys(payload)) { const broken = structuredClone(payload); delete broken[key]; assert.equal(catalogMoviePayloadSchema.safeParse(broken).success, false, key); }
  for (const patch of [{ actorIds: [9001, 9001] }, { filterCountry: 'India' }, { filterGenre: ['Unresolved genre'] }, { genre: { uz: ['Fantastika'], ru: [] } }, { ratingImdb: 11 }])
    assert.equal(catalogMoviePayloadSchema.safeParse({ ...payload, ...patch }).success, false);
  const draft = complete(); draft.movie.description.uz.duration = 99; assert.equal(assessCatalogDraft(draft).ready, false);
  const wrongActor = complete(); wrongActor.movie.actorIds = [9999]; assert.equal(assessCatalogDraft(wrongActor).ready, false);
  const wrongYear = complete(); wrongYear.identity.year = 2015; assert.equal(assessCatalogDraft(wrongYear).ready, false);
});

test('missing optional links remain null; related videos and media-file URLs are not saved as watch/trailer pages', () => {
  const result = input(); result.trailer.kind = 'related'; result.uzbekLinks[0].url = 'https://kinochilar.com/movie.mp4';
  const prepared = prepareCatalogDraft(result, { language: 'en' });
  assert.equal(prepared.movie.trailers, null); assert.equal(prepared.movie.watchUrl, null);
  const draft = complete(); draft.movie.trailers = ''; draft.movie.watchUrl = '';
  assert.equal(assessCatalogDraft(draft).ready, true);
  draft.confirmedUnavailable = ['trailers', 'watchUrl']; assert.equal(assessCatalogDraft(draft).ready, true);
  const spoofed = input(); spoofed.trailer.url = 'https://evil.example/watch?v=zSWdZVtXT7E';
  assert.equal(prepareCatalogDraft(spoofed, { language: 'en' }).movie.trailers, null);
});

test('conflicting official external IDs are left unresolved, and unsupported facts remain research tasks', () => {
  const result = input(); result.sources.push({ title: 'Other film', url: 'https://www.imdb.com/title/tt9999999/' });
  const draft = prepareCatalogDraft(result, { language: 'en' }); assert.equal(draft.identity.imdbId, null);
  const report = assessCatalogDraft(complete());
  for (const field of ['budget', 'boxOffice', 'writers', 'premiere', 'productionYears']) assert.ok(report.issues.some(issue => issue.path === `research.details.${field}` && !issue.blocking));
});

test('poster/character source URLs cannot replace or conflict with the explicitly verified film identity',()=>{
 const result=input();result.identitySources=result.sources.filter(source=>/imdb\.com|kinopoisk\.ru/.test(new URL(source.url).hostname));
 result.sources.push({title:'A character image from another adaptation',url:'https://www.imdb.com/title/tt9999999/'});
 const draft=prepareCatalogDraft(result,{language:'en'});
 assert.equal(draft.identity.imdbId,'tt0816692');assert.equal(draft.identity.kinopoiskId,'258687');
 assert.equal(matchMovieCandidates(movieMatchInput(draft),[{id:8001,specs:{year:2014},catalogIdentity:{imdbId:'tt0816692'}}]).status,'existing');
 assert.ok(draft.research.sources.some(source=>source.url.includes('tt9999999')));
});
