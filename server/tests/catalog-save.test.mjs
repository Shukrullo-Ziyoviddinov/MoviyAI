import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogSaver } from '../dist/ai/catalog/services/catalog-save.service.js';
import { createCatalogMatcher } from '../dist/ai/catalog/services/catalog-match.service.js';
import {createActorBackfillProcessor} from '../dist/ai/catalog/services/catalog-actor-backfill.service.js';
import {validateCatalogReferenceValues} from '../dist/ai/catalog/services/catalog-reference.service.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { emptyDossier } from '../dist/ai/services/movie-dossier.js';
import { Movie } from '../dist/models/Movie.js';
import { Actor } from '../dist/models/Actor.js';

const fact = value => ({ value, sources: [{ title: 'Evidence', url: 'https://example.com/evidence' }] });
function draft(title = 'Example', imdbId = 'tt1234567') {
  const filmSource = { title, url: `https://www.imdb.com/title/${imdbId}/` };
  const details = emptyDossier();
  Object.assign(details, { genres: fact(['Drama']), countries: fact(['United States']), runtimeMinutes: fact(100), ageRating: fact('12+ (RU)'), synopsis: fact('UZ plot'), directors: fact(['Director']), imdb: fact(7), kinopoisk: fact(7.1),
    cast: [{ name: 'An Actor', originalName: 'An Actor', role: 'Hero', sources: [{ title: 'Actor', url: 'https://www.imdb.com/name/nm1234567/' }] }] });
  const input = prepareCatalogDraft({ title, titleUz: title, titleRu: `${title} RU`, year: 2014, confidence: 'high', sources: [filmSource], details,
    posters: [{ url: 'https://example.com/poster-a.jpg', sourceUrl: filmSource.url }, { url: 'https://example.com/poster-b.jpg', sourceUrl: filmSource.url }] },
    { language: 'uz', localized: { ru: { synopsis: fact('RU plot'), country: fact('RU country'), director: fact('Director') } }, confirmedUnavailable: ['trailers', 'watchUrl'] });
  input.actors[0].actorAbout = { uz: 'UZ biography', ru: 'RU biography' };
  input.actors[0].imageCandidates = [{ url: 'https://example.com/actor.jpg', sourceUrl: input.actors[0].sources[0].url }];
  return input;
}
const references = { genres: [{ name: 'Dramma', nameRu: 'Драма' }], countries: [{ name: 'USA' }] };

// Transaction fake snapshots/rollbacks plus a shared gate across independent
// saver instances. Tests never contact the real MongoDB, R2 or image servers.
function harness() {
  let state = { movies: [], actors: [], actorJobs:[], movie: 8000, actor: 9000 };
  let gate = Promise.resolve(); let imageNumber = 0, writes = 0;
  const files = new Set(), removed = [], hooks = {};
  const matcher = current => createCatalogMatcher({ findMovies: async () => ({ records: current().movies, truncated: false }), findActors: async () => ({ records: current().actors, truncated: false }) });
  const repository = {
    matcher: matcher(() => state), references: async () => structuredClone(references),
    async transaction(work) {
      const previous = gate; let unlock; gate = new Promise(resolve => { unlock = resolve; }); await previous;
      let committed = false;
      try {
        const next = structuredClone(state);
        const result = await work({ matcher: matcher(() => next), references: async () => structuredClone(hooks.changedReferences ?? references),
          nextId: async kind => ++next[kind],
          enqueueActors:async(movieId,draft)=>{next.actorJobs.push({movieId,draft:structuredClone(draft)});},
          movieExists:async movieId=>next.movies.some(row=>row.id===movieId),
          linkActors:async(movieId,ids,pending)=>{const row=next.movies.find(row=>row.id===movieId);if(row){row.actorIds=[...new Set([...row.actorIds,...ids])];row.research.pendingActors=pending;}},
          insertActor: async item => { writes++; if (hooks.failActor) throw Error('actor insert failed'); await new Actor({ ...item.payload, id: item.id, catalogIdentity: item.identity }).validate(); next.actors.push({ id: item.id, ...item.payload, catalogIdentity: item.identity, mediaKeys: item.mediaKeys, research: item.research }); },
          insertMovie: async item => { writes++; if (hooks.failMovie) throw Error('movie insert failed'); await new Movie({ ...item.payload, id: item.id, catalogIdentity: item.identity }).validate(); next.movies.push({ id: item.id, ...item.payload, catalogIdentity: item.identity, mediaKeys: item.mediaKeys, posters: item.posters, research: item.research }); },
          linkFranchise: async (id, related) => { if (hooks.failFranchise) throw Error('franchise update failed'); for (const movie of next.movies) if (related.includes(movie.id)) movie.franchiseMovieIds = [...new Set([...(movie.franchiseMovieIds ?? []), id])]; },
          unreferencedMedia: async keys => keys.filter(key => ![...next.movies, ...next.actors].some(row => row.mediaKeys?.includes(key))),
        });
        state = next; committed = true;
        if (hooks.uncertainCommit) { hooks.uncertainCommit = false; throw Error('unknown commit result'); }
        return result;
      } finally { hooks.lastCommitted = committed; unlock(); }
    },
  };
  const media = {
    async store(folder, urls, count, track) {
      if (hooks.beforeMedia) await hooks.beforeMedia();
      const assets = urls.slice(0, count).map(sourceUrl => { const key = `${folder}/test-${++imageNumber}.jpg`; track(key); files.add(key); return { key, path: `/img/test-${imageNumber}.jpg`, sourceUrl }; });
      if(hooks.failActorMedia&&folder==='actorimg')throw Error('Actor image source failed');
      if (hooks.failMedia) throw Error('R2 failure'); return assets;
    },
    async remove(key) { removed.push(key); files.delete(key); },
  };
  return { repository, media, hooks, files, removed, save: createCatalogSaver({ repository, media,posterSearch:async()=>({images:[]}) }), state: () => state, writes: () => writes };
}

test('existing film performs no uploads or writes, even if new enrichment is incomplete', async () => {
  const h = harness(); h.state().movies.push({ id: 8001, catalogIdentity: { imdbId: 'tt1234567' }, specs: { year: 2014 } });
  const input = draft(); input.actors = []; input.posterCandidates = [];
  assert.deepEqual(await h.save(input), { status: 'existing', movieId: 8001 }); assert.equal(h.files.size, 0); assert.equal(h.writes(), 0);
});

test('new film and actor are saved together with R2 paths, all posters, source evidence and real IDs', async () => {
  const h = harness(), input = draft(), before = structuredClone(input);
  input.actors[0].existingId = 999999; input.movie.actorIds = [999999]; // AI-supplied IDs are ignored.
  const result = await h.save(input);
  assert.equal(result.status, 'created'); assert.deepEqual(result.actorIds, [9001]); assert.equal(result.posters.length, 2);
  assert.equal(h.state().movies.length, 1); assert.equal(h.state().actors.length, 1);
  const saved = h.state().movies[0]; assert.equal(saved.homeImgPoster, result.posters[0]); assert.equal(saved.actorIds[0], 9001);
  assert.equal(saved.research.result.title, before.research.title); assert.equal(saved.research.storedAssets.length, 2);
  assert.equal(h.files.size, 3); assert.equal(h.removed.length, 0); assert.equal(input.movie.homeImgPoster, null);
});

test('two simultaneous requests from separate saver instances create one movie and one actor', async () => {
  const h = harness(), otherSave = createCatalogSaver({ repository: h.repository, media: h.media });
  const results = await Promise.all([h.save(draft()), otherSave(draft())]);
  assert.equal(results.filter(result => result.status === 'created').length, 1); assert.equal(results.filter(result => result.status === 'existing').length, 1);
  assert.equal(h.state().movies.length, 1); assert.equal(h.state().actors.length, 1); assert.equal(h.files.size, 3);
  assert.equal(results[0].movieId, results[1].movieId); assert.equal(h.state().movie, 8001); assert.equal(h.state().actor, 9001);
});

test('different movies sharing an actor reuse that actor after the transactional recheck', async () => {
  const h = harness(); const results = await Promise.all([h.save(draft('First', 'tt1111111')), h.save(draft('Second', 'tt2222222'))]);
  assert.ok(results.every(result => result.status === 'created')); assert.equal(h.state().movies.length, 2); assert.equal(h.state().actors.length, 1);
  assert.deepEqual(h.state().movies.map(movie => movie.actorIds), [[9001], [9001]]); assert.equal(h.files.size, 5);
});

test('missing required translations and canonical dictionary matches defer publication', async () => {
  for (const change of [input => { input.movie.title.ru = null; }, input => { input.research.details.countries = fact(['United Kingdom']); }]) {
    const h = harness(), input = draft(); change(input); const result = await h.save(input);
    assert.equal(result.status, 'needs-enrichment');assert.equal(h.state().movies.length,0);
  }
});

test('unknown actors or missing actor biographies/photos do not prevent the movie from saving',async()=>{
 for(const change of [input=>{input.actors[0].actorAbout.ru=null;},input=>{input.actors[0].imageCandidates=[];},input=>{input.actors=[];}]){
  const h=harness(),input=draft();change(input);const result=await h.save(input);
  assert.equal(result.status,'created');assert.deepEqual(result.actorIds,[]);assert.equal(h.state().movies.length,1);assert.equal(h.state().actors.length,0);assert.equal(h.state().actorJobs.length,1);assert.equal(h.files.size,2);
 }
});
test('available actors save now and unresolved cast is durably queued inside the movie transaction',async()=>{
 const h=harness(),input=draft();const missing=structuredClone(input.actors[0]);missing.actorName='Unknown actor';missing.originalName='Unknown actor';missing.identity={imdbId:null,kinopoiskId:null,birthDate:null};missing.actorAbout={uz:null,ru:null};input.actors.push(missing);
 const result=await h.save(input);assert.equal(result.status,'created');assert.equal(result.actorIds.length,1);assert.equal(h.state().actorJobs[0].draft.actors[0].actorName,'Unknown actor');assert.equal(h.state().actorJobs[0].movieId,result.movieId);
});
test('actor image failures defer only actors and clean unused media while the movie remains saved',async()=>{
 const h=harness();h.hooks.failActorMedia=true;const result=await h.save(draft());assert.equal(result.status,'created');assert.deepEqual(result.actorIds,[]);assert.equal(h.state().actorJobs.length,1);assert.equal(h.files.size,2);assert.equal(h.removed.length,1);
});
test('later actor backfill adds actors to the saved movie without replacing or duplicating it',async()=>{
 const h=harness(),input=draft();input.actors[0].actorAbout.ru=null;const saved=await h.save(input);const queued=h.state().actorJobs[0];
 const backfill=createActorBackfillProcessor({repository:h.repository,media:h.media,enrich:async draft=>{const next=structuredClone(draft);next.actors[0].actorAbout.ru='Researched RU biography';return next;}});
 const result=await backfill(saved.movieId,queued.draft,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.completed,true);assert.equal(h.state().movies.length,1);assert.equal(h.state().actors.length,1);assert.equal(h.state().movies[0].actorIds.length,1);assert.deepEqual(h.state().movies[0].research.pendingActors,[]);
 const repeat=await backfill(saved.movieId,queued.draft,AbortSignal.timeout(1000),async()=>{});assert.equal(repeat.completed,true);assert.equal(h.state().actors.length,1);assert.equal(h.state().movies[0].actorIds.length,1);
});
test('backfill does not recreate a deleted movie or add orphan actors',async()=>{
 const h=harness();let called=false;const backfill=createActorBackfillProcessor({repository:h.repository,media:h.media,enrich:async draft=>{called=true;return draft;}});
 const result=await backfill(9999,draft(),AbortSignal.timeout(1000),async()=>{});assert.equal(result.completed,true);assert.equal(called,false);assert.equal(h.state().actors.length,0);
});

test('movie insert or reciprocal franchise failure rolls back actors and counters, removing only unused media', async () => {
  for (const option of ['failMovie', 'failFranchise']) {
    const h = harness(); h.hooks[option] = true;
    await assert.rejects(() => h.save(draft()), /failed/); assert.equal(h.state().actors.length, 0); assert.equal(h.state().movies.length, 0);
    assert.equal(h.state().movie, 8000); assert.equal(h.state().actor, 9000); assert.equal(h.files.size, 0);
  }
});

test('poster storage failure retains a retryable draft without publishing a broken movie', async () => {
  const h = harness(); h.hooks.failMedia = true;const result=await h.save(draft());assert.equal(result.status,'needs-enrichment');assert.equal(h.state().movies.length,0); assert.equal(h.files.size, 0);
  const changed = harness(); changed.hooks.changedReferences = { genres: [], countries: [] };
  assert.equal((await changed.save(draft())).status, 'needs-enrichment');assert.equal(changed.state().movies.length,0);assert.equal(changed.files.size,0);
});

test('title-only research stays retryable instead of completing an empty movie',async()=>{
 const h=harness(),input=draft();input.identity={originalTitle:'Example',year:null,imdbId:null,kinopoiskId:null};
 input.research.year=null;input.research.sources=[{title:'Example film',url:'https://studio.example/movies/example'}];input.research.identitySources=input.research.sources;input.research.details=emptyDossier();
 input.movie.title={uz:null,ru:null};input.movie.ratingImdb=null;input.movie.ratingKinopoisk=null;input.movie.specs={duration:null,ageRating:null,year:null,countries:[]};
 for(const lang of ['uz','ru'])input.movie.description[lang]={text:null,year:null,country:null,duration:null,director:null};
 input.movie.trailers=null;input.movie.watchUrl=null;input.posterCandidates=[];input.actors=[];
 const result=await h.save(input);assert.equal(result.status,'needs-enrichment');assert.equal(h.state().movies.length,0);assert.equal(h.files.size,0);
});

test('missing ratings and optional facts still allow a researched movie to save',async()=>{
 const h=harness(),input=draft();input.research.details.imdb={value:null,sources:[]};input.research.details.kinopoisk={value:null,sources:[]};input.movie.ratingImdb=null;input.movie.ratingKinopoisk=null;
 const result=await h.save(input);assert.equal(result.status,'created');assert.equal(h.state().movies[0].ratingImdb,null);
});
test('missing facts do not authorize an unsupported film identity or a guessed duplicate',async()=>{
 const h=harness(),input=draft();input.research.confidence='low';assert.equal((await h.save(input)).status,'needs-enrichment');assert.equal(h.state().movies.length,0);
 const ambiguous=harness();ambiguous.state().movies.push({id:7999,title:{uz:'Example'},specs:{year:2000}});
 const unknown=draft();unknown.identity.year=null;unknown.research.year=null;unknown.movie.specs.year=null;unknown.movie.description.uz.year=null;unknown.movie.description.ru.year=null;
 unknown.identity.imdbId=null;unknown.research.sources=[{title:'Example film',url:'https://studio.example/movies/example'}];unknown.research.identitySources=unknown.research.sources;
 assert.equal((await ambiguous.save(unknown)).status,'needs-enrichment');assert.equal(ambiguous.state().movies.length,1);
});

test('uncertain commit never deletes media of a committed movie; retry returns its existing ID', async () => {
  const h = harness(); h.hooks.uncertainCommit = true;
  await assert.rejects(() => h.save(draft()), /unknown commit/); assert.equal(h.state().movies.length, 1); assert.equal(h.files.size, 3);
  assert.equal((await h.save(draft())).status, 'existing'); assert.equal(h.state().movies.length, 1); assert.equal(h.files.size, 3);
});

test('verified existing franchise films link in both directions; arbitrary internal IDs are not accepted', async () => {
  const h = harness(); h.state().movies.push({ id: 7999, title: { uz: 'Earlier film' }, specs: { year: 2010 }, catalogIdentity: { imdbId: 'tt7654321' }, franchiseMovieIds: [] });
  const input = draft(); input.franchiseCandidates = [{ relation: fact('Same sourced film series'), film: { originalTitle: 'Earlier film', aliases: [], year: 2010, imdbId: 'tt7654321', kinopoiskId: null, sources: [{ title: 'Earlier film', url: 'https://www.imdb.com/title/tt7654321/' }] } }];
  const result = await h.save(input); assert.equal(result.status, 'created');
  assert.deepEqual(h.state().movies.find(movie => movie.id === result.movieId).franchiseMovieIds, [7999]); assert.deepEqual(h.state().movies[0].franchiseMovieIds, [result.movieId]);
  const invalid = harness(), guessed = draft(); guessed.movie.franchiseMovieIds = [7999];
  assert.equal((await invalid.save(guessed)).status, 'created');assert.deepEqual(invalid.state().movies[0].franchiseMovieIds,[]);
});
