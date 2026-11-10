import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { emptyDossier } from '../dist/ai/services/movie-dossier.js';
import { createCatalogEnricher } from '../dist/ai/catalog/services/catalog-enrichment.service.js';
import { createCatalogChatProcessor } from '../dist/ai/catalog/services/catalog-chat-save.service.js';
import { catalogFailureDetails } from '../dist/ai/catalog/utils/catalog-diagnostics.js';

const source = { title: 'Example film', url: 'https://www.imdb.com/title/tt1234567/' };
const fact = value => ({ value, sources: [source] });
function fixture() {
  const details = emptyDossier();
  Object.assign(details, { genres: fact(['Drama']), countries: fact(['USA']), runtimeMinutes: fact(100), ageRating: fact('12+ (RU)'), synopsis: fact('Sourced film plot'), directors: fact(['A Director']), imdb: fact(7), kinopoisk: fact(7),
    cast: [{ name: 'An Actor', originalName: 'An Actor', role: 'Hero', sources: [source] }] });
  const movie = { title: 'Example', titleUz: 'Misol', titleRu: null, year: 2014, confidence: 'high', details, sources: [source], posters: [{ url: 'https://example.com/poster.jpg', sourceUrl: source.url }] };
  return { movie, language: 'uz', actorImages: [{ label: 'An Actor', imageUrl: 'https://example.com/actor.jpg', sourceUrl: 'https://www.imdb.com/name/nm1234567/' }] };
}
const translated = { uz: { title: 'Changed UZ title', synopsis: 'UZ plot', country: 'AQSh', director: 'A Director' }, ru: { title: 'Пример', synopsis: 'RU plot', country: 'США', director: 'A Director' } };
const references = { genres: [{ name: 'Dramma', nameRu: 'Драма' }], countries: [{ name: 'USA' }] };
const notFound = async () => ({ status: 'not-found', method: 'checked-candidates' });
function harness({ person = true, credit = true } = {}) {
  let modelCalls = 0, imageCalls = 0, checkpoints = 0;
  const evidence = [
    { title: 'An Actor - IMDb', link: 'https://www.imdb.com/name/nm1234567/', snippet: 'An Actor starred in Example (2014). Born January 1, 1980.' },
    { title: 'Example (2014)', link: 'https://www.imdb.com/title/tt1234567/', snippet: 'An Actor played Hero in Example (2014).' },
  ];
  const generate = async (_schema, payload) => {
    modelCalls++;
    if (payload.actor) return { samePerson: person, personIndex: 0, creditSourceIndexes: credit ? [0, 1] : [],
      biographyUz: { value: 'An Actor Example filmida o‘ynagan.', sourceIndexes: [0] }, biographyRu: { value: 'An Actor starred in Example.', sourceIndexes: [1] }, birthDate: { value: '1980-01-01', sourceIndexes: [0] } };
    return translated;
  };
  const enrich = createCatalogEnricher({ generate, searchWeb: async () => ({ organic: evidence }), searchImages: async () => { imageCalls++; return { images: [] }; }, matcher: { actor: notFound, movie: notFound } });
  return { enrich, checkpoint: async () => { checkpoints++; }, models: () => modelCalls, images: () => imageCalls, checkpoints: () => checkpoints };
}

test('background enrichment adds sourced translations/person identity/biographies and reuses only actor portraits', async () => {
  const input = fixture(), draft = prepareCatalogDraft(input.movie, { language: 'uz' }), before = structuredClone(draft), h = harness();
  const enriched = await h.enrich(draft, input, AbortSignal.timeout(1000), h.checkpoint);
  assert.equal(enriched.movie.title.uz, 'Misol'); assert.equal(enriched.movie.title.ru, 'Пример'); assert.equal(enriched.movie.description.ru.country, 'США');
  assert.equal(enriched.localizedFacts.ru.title.sources[0].url, source.url); assert.equal(enriched.actors[0].identity.imdbId, 'nm1234567');
  assert.equal(enriched.actors[0].identity.birthDate.value, '1980-01-01'); assert.ok(enriched.actors[0].actorAbout.uz);
  assert.equal(enriched.actors[0].imageCandidates[0].url, input.actorImages[0].imageUrl); assert.equal(h.images(), 0); assert.deepEqual(draft, before);
  const paid = h.models(); await h.enrich(enriched, input, AbortSignal.timeout(1000), h.checkpoint); assert.equal(h.models(), paid);
});

test('real actor enrichment boundaries distinguish Google 503 from Serper 503',async()=>{
 for(const provider of ['google','serper']){
  const input=fixture();const enrich=createCatalogEnricher({
   generate:async(_schema,payload)=>{if(payload.actor)throw Object.assign(Error('SECRET prompt'),{status:503});return translated;},
   searchWeb:async()=>{if(provider==='serper')throw Object.assign(Error('SECRET API key'),{status:503});return {organic:[]};},
   searchImages:async()=>({images:[]}),matcher:{actor:notFound,movie:notFound},
  });
  await assert.rejects(()=>enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{}),error=>{
   const info=catalogFailureDetails(error);assert.equal(info.provider,provider);assert.equal(info.stage,provider==='google'?'actor-facts':'actor-evidence');assert.equal(info.providerStatus,503);assert.doesNotMatch(JSON.stringify(error),/SECRET/);return true;
  });
 }
});

test('unsupported person identity or missing film credits never become an invented actor ID or biography', async () => {
  for (const options of [{ person: false }, { credit: false }]) {
    const input = fixture(), h = harness(options); const result = await h.enrich(prepareCatalogDraft(input.movie, { language: 'uz' }), input, AbortSignal.timeout(1000), h.checkpoint);
    assert.equal(result.actors[0].identity.imdbId, null); assert.equal(result.actors[0].actorAbout.uz, null); assert.equal(result.actors[0].imageCandidates, undefined);
  }
});

test('translation output cannot fill source facts that remain unverified after research', async () => {
  const input = fixture(); input.movie.details.countries = { value: null, sources: [] };
  const raw = Object.fromEntries(Object.keys(emptyDossier()).filter(key => key !== 'checkedAt').map(key => [key, ['cast', 'characters'].includes(key) ? [] : { value: null, sourceIndexes: [] }]));
  const enrich = createCatalogEnricher({ generate: async (_schema, payload) => payload.sources ? { dossier: raw, year: { value: null, sourceIndexes: [] } } : translated,
    searchWeb: async () => ({ organic: [] }), searchImages: async () => ({ images: [] }), matcher: { actor: async () => ({ status: 'existing', id: 9001, method: 'external-id' }), movie: notFound } });
  const result = await enrich(prepareCatalogDraft(input.movie, { language: 'uz' }), input, AbortSignal.timeout(1000), async () => {});
  assert.equal(result.movie.description.uz.country, null); assert.equal(result.movie.description.ru.country, null); assert.equal(result.research.details.countries.value, null);
});

test('missing dictionary values stop before paid actor research and never substitute another country', async () => {
  const input = fixture(); input.movie.details.countries = fact(['United Kingdom']);
  let paid = 0;
  const process = createCatalogChatProcessor({ matcher: { movie: notFound, actor: notFound }, references: async () => references,
    enrich: async () => { paid++; throw Error('must not research'); }, links: async () => { throw Error('must not search'); }, save: async () => { throw Error('must not save'); } });
  const result = await process(input, null, AbortSignal.timeout(1000), async () => {});
  assert.equal(result.status, 'needs-enrichment'); assert.ok(result.issues.some(issue => issue.value === 'United Kingdom')); assert.equal(paid, 0);
});

test('existing catalogue films skip translation, image search and storage entirely', async () => {
  const input = fixture();
  const process = createCatalogChatProcessor({ matcher: { movie: async () => ({ status: 'existing', id: 8001, method: 'external-id' }), actor: notFound },
    references: async () => { throw Error('must not load'); }, enrich: async () => { throw Error('must not enrich'); }, links: async () => { throw Error('must not search'); }, save: async () => { throw Error('must not save'); } });
  assert.deepEqual(await process(input, null, AbortSignal.timeout(1000), async () => {}), { status: 'existing', movieId: 8001 });
});

test('the chat processor checkpoints enriched data before saving so storage retries retain completed research', async () => {
  const input = fixture(), h = harness(); const checkpoints = []; let saved;
  const process = createCatalogChatProcessor({ matcher: { movie: notFound, actor: notFound }, references: async () => references, enrich: h.enrich,
    links: async draft => { draft.confirmedUnavailable = ['trailers', 'watchUrl']; return draft; }, save: async draft => { saved = draft; throw Error('storage failed'); } });
  await assert.rejects(() => process(input, null, AbortSignal.timeout(1000), async draft => { checkpoints.push(structuredClone(draft)); }), /CATALOG_INTERNAL_SAVE/);
  assert.equal(checkpoints.at(-1).actors[0].identity.imdbId, 'nm1234567'); assert.deepEqual(checkpoints.at(-1), saved);
  const paid = h.models();
  await assert.rejects(() => process(input, checkpoints.at(-1), AbortSignal.timeout(1000), async () => {}), /CATALOG_INTERNAL_SAVE/); assert.equal(h.models(), paid);
});
