import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogLinkResearch } from '../dist/ai/catalog/services/catalog-link-research.service.js';
import { createCatalogFranchiseResearch } from '../dist/ai/catalog/services/catalog-franchise-research.service.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { UZBEK_MOVIE_SITES } from '../dist/ai/services/uzbek-movie.service.js';

function draft() { return prepareCatalogDraft({ title: 'Example 2', titleUz: 'Misol 2', titleRu: null, year: 2014, confidence: 'high', sources: [{ title: 'Film', url: 'https://example.com/film' }], posters: [] }, { language: 'uz' }); }
function links({ fail = false, video = null, found = [] } = {}) {
  return createCatalogLinkResearch({
    searchVideos: async () => { if (fail) throw Error('provider down'); return { videos: [] }; }, searchWeb: async () => { if (fail) throw Error('provider down'); return { organic: [] }; },
    trailerSearch: deps => async () => { try { await deps.searchVideos('query', {}); } catch { return null; } return video; },
    uzbekSearch: deps => async () => { for (const site of UZBEK_MOVIE_SITES) try { await deps.searchWeb(`site:${site} query`, {}); } catch { /* Actual search service isolates site failures. */ } return found; },
    readPage: async () => null, discover: async () => [],
  });
}

test('empty optional URLs are confirmed only after provider searches actually succeed', async () => {
  const input = draft(); const successful = await links()(input, AbortSignal.timeout(1000));
  assert.deepEqual(successful.confirmedUnavailable, ['trailers', 'watchUrl']); assert.deepEqual(input.confirmedUnavailable, []);
  assert.deepEqual((await links({ fail: true })(input, AbortSignal.timeout(1000))).confirmedUnavailable, []);
});
test('actual trailer and verified movie-page URLs map to distinct fields; related videos are not trailers', async () => {
  const trailer = { kind: 'trailer', videoId: 'zSWdZVtXT7E', url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E', title: 'Example trailer', channel: 'Studio' };
  const found = [{ title: 'Misol 2', site: 'asilmedia.org', url: 'https://asilmedia.org/123-example-2.html' }];
  const result = await links({ video: trailer, found })(draft(), AbortSignal.timeout(1000));
  assert.equal(result.movie.trailers, trailer.url); assert.equal(result.movie.watchUrl, found[0].url); assert.deepEqual(result.confirmedUnavailable, []);
  assert.equal(result.movie.title.uz,'Misol 2');assert.equal(result.research.titleUz,'Misol 2');
  const related = await links({ video: { ...trailer, kind: 'related' } })(draft(), AbortSignal.timeout(1000));
  assert.equal(related.movie.trailers, null); assert.ok(related.confirmedUnavailable.includes('trailers'));
});

test('verified release overrides a translated fallback; absent releases preserve fallback',async()=>{
 const input=draft();assert.equal(input.movie.title.uz,'Misol 2');
 input.movie.title.uz='Invented translation';
 const result=await links()(input,AbortSignal.timeout(1000));assert.equal(result.movie.title.uz,'Invented translation');
 const found=[{title:'Haqiqiy nom 2 / Example 2 2014 Uzbek tilida',site:'asilmedia.org',url:'https://asilmedia.org/123-example-2.html'}];
 const verified=await links({found})(input,AbortSignal.timeout(1000));assert.equal(verified.movie.title.uz,'Haqiqiy nom 2');
});
test('franchise research retains only explicitly cited member titles/years and checkpoints avoid repeated paid queries', async () => {
  let queries = 0;
  const research = createCatalogFranchiseResearch({ searchWeb: async () => { queries++; return { organic: [{ title: 'Example film series', link: 'https://example.com/series', snippet: 'The Example film series includes Example (2010) and Example 2 (2014).' }] }; },
    generate: async () => ({ seriesName: 'Example', sourceIndexes: [0], members: [{ title: 'Example', year: 2010, sourceIndexes: [0] }, { title: 'Example 2', year: 2014, sourceIndexes: [0] }, { title: 'Invented sequel', year: 2025, sourceIndexes: [0] }] }) });
  const result = await research(draft(), AbortSignal.timeout(1000));
  assert.equal(result.franchiseCandidates.length, 1); assert.equal(result.franchiseCandidates[0].film.originalTitle, 'Example'); assert.equal(result.franchiseCandidates[0].film.year, 2010);
  await research(result, AbortSignal.timeout(1000)); assert.equal(queries, 1);
});
test('a different franchise or a shared title prefix alone never establishes a franchise link', async () => {
  const research = createCatalogFranchiseResearch({ searchWeb: async () => ({ organic: [{ title: 'Unrelated film series', link: 'https://example.com/other', snippet: 'Unrelated film series with Another Movie (2010).' }] }),
    generate: async () => ({ seriesName: 'Unrelated', sourceIndexes: [0], members: [{ title: 'Another Movie', year: 2010, sourceIndexes: [0] }] }) });
  assert.deepEqual((await research(draft(), AbortSignal.timeout(1000))).franchiseCandidates, []);
});

test('explicit sequel relation on the existing full film page needs no new paid search',async()=>{
 const input=draft();input.research.identitySources=[{title:'Example 2',url:'https://en.wikipedia.org/wiki/Example_2'}];
 const research=createCatalogFranchiseResearch({searchWeb:async()=>{throw Error('unnecessary search');},readPage:async source=>({...source,snippet:'Example 2 (2014) is a sequel to Example (2010), part of the Example trilogy.'}),
  generate:async()=>({seriesName:'Example',sourceIndexes:[0],members:[{title:'Example',year:2010,sourceIndexes:[0]}]})});
 const result=await research(input,AbortSignal.timeout(1000));assert.equal(result.franchiseCandidates[0].film.originalTitle,'Example');
});

test('optional link research retains every found watch URL',async()=>{
 const found=[{title:'Misol',site:'asilmedia.org',url:'https://asilmedia.org/123-film.html'},{title:'Misol',site:'uzmovi.net',url:'https://uzmovi.net/123-film.html'}];
 const result=await links({found})(draft(),AbortSignal.timeout(1000));
 assert.deepEqual(result.movie.watchUrls,found.map(link=>link.url));
 assert.equal(result.movie.watchUrl,found[0].url);
});
