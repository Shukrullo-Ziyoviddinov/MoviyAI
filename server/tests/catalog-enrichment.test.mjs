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
test('background research retains every supported dossier field, including budget, writers and characters',async()=>{
 const input=fixture();input.movie.details.countries={value:null,sources:[]};
 const found=structuredClone(input.movie.details);found.countries=fact(['USA']);found.budget=fact('$28 million');found.boxOffice=fact('$131 million');found.writers=fact(['A Writer']);found.premiere=fact('11 September 2014');found.productionYears=fact('2013-2014');found.characters=[{name:'Hero',originalName:'Hero',description:'Known character',sources:[source]}];
 const enrich=createCatalogEnricher({researchSources:async()=>found,generate:async()=>translated,searchWeb:async()=>({organic:[]}),searchImages:async()=>({images:[]}),matcher:{actor:async()=>({status:'existing',id:9001,method:'external-id'}),movie:notFound}});
 const result=await enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{});
 for(const key of ['budget','boxOffice','writers','premiere','productionYears','characters'])assert.deepEqual(result.research.details[key],found[key]);
});
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
  const enrich = createCatalogEnricher({readSource:async()=>null, generate, searchWeb: async () => ({ organic: evidence }), searchImages: async () => { imageCalls++; return { images: [] }; }, matcher: { actor: notFound, movie: notFound } });
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
  const input=fixture();const enrich=createCatalogEnricher({readSource:async()=>null,
   generate:async(_schema,payload)=>{if(payload.actor)throw Object.assign(Error('SECRET prompt'),{status:503});return translated;},
   searchWeb:async()=>{if(provider==='serper')throw Object.assign(Error('SECRET API key'),{status:503});return {organic:[]};},
   searchImages:async()=>({images:[]}),matcher:{actor:notFound,movie:notFound},
  });
  const result=await enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{});
  const info=result.actors[0].enrichmentIssue;assert.equal(info.provider,provider);assert.equal(info.stage,provider==='google'?'actor-facts':'actor-evidence');assert.equal(info.providerStatus,503);assert.doesNotMatch(JSON.stringify(info),/SECRET/);
 }
});

test('unsupported person identity or missing film credits never become an invented actor ID or biography', async () => {
  for (const options of [{ person: false }, { credit: false }]) {
    const input = fixture(), h = harness(options); const result = await h.enrich(prepareCatalogDraft(input.movie, { language: 'uz' }), input, AbortSignal.timeout(1000), h.checkpoint);
    assert.equal(result.actors[0].identity.imdbId, null); assert.equal(result.actors[0].actorAbout.uz, null); assert.equal(result.actors[0].imageCandidates, undefined);
  }
});

test('actor research obtains film credits separately when biography snippets omit the film title',async()=>{
 const input=fixture();const queries=[];
 const profile={title:'An Actor - IMDb',link:'https://www.imdb.com/name/nm1234567/',snippet:'An Actor is an actor, born January 1, 1980.'};
 const credit={title:'Example (2014)',link:source.url,snippet:'With An Actor as Hero.'};
 const enrich=createCatalogEnricher({readSource:async()=>null,
  searchWeb:async query=>{queries.push(query);return {organic:query.includes(' cast ')?[credit]:[profile]};},
  searchImages:async()=>({images:[]}),matcher:{actor:notFound,movie:notFound},
  generate:async(_schema,payload)=>payload.actor?{samePerson:true,personIndex:0,creditSourceIndexes:[1],biographyUz:{value:'Sourced biography UZ',sourceIndexes:[0]},biographyRu:{value:'Sourced biography RU',sourceIndexes:[0]},birthDate:{value:'1980-01-01',sourceIndexes:[0]}}:translated,
 });
 const result=await enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.actors[0].identity.imdbId,'nm1234567');assert.ok(result.actors[0].actorAbout.uz);
 assert.ok(queries.some(query=>query.includes('"Example"')&&query.includes(' cast ')));
});

test('translation output cannot fill source facts that remain unverified after research', async () => {
  const input = fixture(); input.movie.details.countries = { value: null, sources: [] };
  const raw = Object.fromEntries(Object.keys(emptyDossier()).filter(key => key !== 'checkedAt').map(key => [key, ['cast', 'characters'].includes(key) ? [] : { value: null, sourceIndexes: [] }]));
  const enrich = createCatalogEnricher({readSource:async()=>null, generate: async (_schema, payload) => payload.sources ? { dossier: raw, year: { value: null, sourceIndexes: [] } } : translated,
    searchWeb: async () => ({ organic: [] }), searchImages: async () => ({ images: [] }), matcher: { actor: async () => ({ status: 'existing', id: 9001, method: 'external-id' }), movie: notFound } });
  const result = await enrich(prepareCatalogDraft(input.movie, { language: 'uz' }), input, AbortSignal.timeout(1000), async () => {});
  assert.equal(result.movie.description.uz.country, null); assert.equal(result.movie.description.ru.country, null); assert.equal(result.research.details.countries.value, null);
});
test('a previously unknown year is filled only when the researched source explicitly supports it',async()=>{
 const input=fixture();input.movie.year=null;
 const raw=Object.fromEntries(Object.keys(emptyDossier()).filter(key=>key!=='checkedAt').map(key=>[key,['cast','characters'].includes(key)?[]:{value:null,sourceIndexes:[]} ]));
 const enrich=createCatalogEnricher({readSource:async()=>null,generate:async(_schema,payload)=>payload.sources?{dossier:raw,year:{value:2014,sourceIndexes:[0]}}:translated,
  searchWeb:async()=>({organic:[{title:'Example (2014)',link:source.url,snippet:'Example was released in 2014.'}]}),searchImages:async()=>({images:[]}),matcher:{actor:async()=>({status:'existing',id:9001,method:'external-id'}),movie:notFound}});
 const result=await enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.identity.year,2014);assert.equal(result.movie.specs.year,2014);assert.equal(result.movie.description.uz.year,2014);
});
test('actor backfill does not repeat missing movie ratings, translations or poster research',async()=>{
 const input=fixture();input.movie.details.imdb={value:null,sources:[]};input.movie.details.kinopoisk={value:null,sources:[]};input.movie.year=null;input.movie.posters=[];
 const enrich=createCatalogEnricher({readSource:async()=>null,generate:async()=>{throw Error('unrelated movie research');},searchWeb:async()=>{throw Error('unrelated web search');},searchImages:async()=>{throw Error('unrelated poster search');},references:async()=>{throw Error('unrelated reference lookup');},matcher:{actor:async()=>({status:'existing',id:9001,method:'external-id'}),movie:notFound}});
 const result=await enrich(prepareCatalogDraft(input.movie,{language:'uz'}),input,AbortSignal.timeout(1000),async()=>{},true);
 assert.equal(result.actors[0].existingId,9001);assert.equal(result.movie.ratingImdb,null);assert.equal(result.movie.specs.year,null);
});

test('catalogue save reuses completed chat source research instead of repeating paid fact searches',async()=>{
 const input=fixture();input.movie.sourceResearchComplete=true;input.movie.details.imdb={value:null,sources:[]};input.movie.titleRu='Example RU';
 const draft=prepareCatalogDraft(input.movie,{language:'uz'});
 for(const locale of ['uz','ru'])Object.assign(draft.movie.description[locale],{text:'Known plot',country:'USA',director:'Known director'});
 const enrich=createCatalogEnricher({generate:async()=>{throw Error('repeated fact extraction');},searchWeb:async()=>{throw Error('repeated paid search');},searchImages:async()=>{throw Error('unexpected poster search');},matcher:{actor:async()=>({status:'existing',id:9001,method:'external-id'}),movie:notFound}});
 const result=await enrich(draft,input,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.movie.ratingImdb,null);assert.equal(result.actors[0].existingId,9001);
});

test('existing actor is reused after one official profile identity check without new biography or image research',async()=>{
 const input=fixture();input.movie.titleRu='RU';input.movie.sourceResearchComplete=true;
 const draft=prepareCatalogDraft(input.movie,{language:'uz'});for(const locale of ['uz','ru'])Object.assign(draft.movie.description[locale],{text:'Plot',country:'USA',director:'Director'});
 let queries=0;
 const enrich=createCatalogEnricher({generate:async()=>{throw Error('must reuse existing biography');},searchImages:async()=>{throw Error('must reuse existing image');},
  searchWeb:async()=>{queries++;return {organic:[{title:'An Actor - IMDb',link:'https://www.imdb.com/name/nm1234567/',snippet:'An Actor biography.'}]};},
  matcher:{movie:notFound,actor:async actor=>actor.imdbId==='nm1234567'?{status:'existing',id:9001,method:'external-id'}:{status:'needs-research',reason:'Needs person ID',candidateIds:[9001]}}});
 const result=await enrich(draft,input,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.actors[0].existingId,9001);assert.equal(queries,1);
});

test('unknown country is retained as null without substituting another country or preventing the save', async () => {
  const input = fixture(); input.movie.details.countries = fact(['United Kingdom']);
  let paid = 0;
  const process = createCatalogChatProcessor({ matcher: { movie: notFound, actor: notFound }, references: async () => references,
    enrich: async draft => { paid++; return draft; }, links: async draft => draft, save: async draft => {assert.equal(draft.movie.filterCountry,null);assert.deepEqual(draft.movie.specs.countries,[]);return {status:'created',movieId:8001};} });
  const result = await process(input, null, AbortSignal.timeout(1000), async () => {});
  assert.equal(result.status, 'created'); assert.equal(paid, 1);
});

test('existing catalogue films skip translation, image search and storage entirely', async () => {
  const input = fixture();
  const process = createCatalogChatProcessor({ matcher: { movie: async () => ({ status: 'existing', id: 8001, method: 'external-id' }), actor: notFound },
    references: async () => { throw Error('must not load'); }, enrich: async () => { throw Error('must not enrich'); }, links: async () => { throw Error('must not search'); }, save: async () => { throw Error('must not save'); } });
  assert.deepEqual(await process(input, null, AbortSignal.timeout(1000), async () => {}), { status: 'existing', movieId: 8001 });
});

test('optional provider failures preserve checkpointed facts and still save nullable fields',async()=>{
 const input=fixture();let saved=false;
 const process=createCatalogChatProcessor({matcher:{movie:notFound},references:async()=>references,
  enrich:async(draft,_input,_signal,checkpoint)=>{draft.movie.ratingImdb=null;await checkpoint(draft);throw Object.assign(Error('provider unavailable'),{status:503});},
  links:async()=>{throw Object.assign(Error('provider unavailable'),{status:503});},
  save:async draft=>{saved=true;assert.equal(draft.movie.ratingImdb,null);return {status:'created',movieId:8001};},
 });
 const result=await process(input,null,AbortSignal.timeout(1000),async()=>{});assert.equal(result.status,'created');assert.equal(saved,true);
});
test('checkpoint failures are never swallowed as optional missing data',async()=>{
 const process=createCatalogChatProcessor({matcher:{movie:notFound},references:async()=>references,
  enrich:async(draft,_input,_signal,checkpoint)=>{await checkpoint(draft);return draft;},links:async draft=>draft,save:async()=>{throw Error('must not save');},
 });
 await assert.rejects(()=>process(fixture(),null,AbortSignal.timeout(1000),async()=>{throw Error('checkpoint DB failure');}),/checkpoint DB failure/);
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
