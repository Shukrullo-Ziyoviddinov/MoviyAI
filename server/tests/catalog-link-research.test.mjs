import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogLinkResearch } from '../dist/ai/catalog/services/catalog-link-research.service.js';
import { createCatalogFranchiseResearch } from '../dist/ai/catalog/services/catalog-franchise-research.service.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';

function draft() { return prepareCatalogDraft({ title: 'Example 2', titleUz: 'Misol 2', titleRu: null, year: 2014, confidence: 'high', sources: [{ title: 'Film', url: 'https://example.com/film' }], posters: [] }, { language: 'uz' }); }
function links({ fail = false, video = null, found = [] } = {}) {
  return createCatalogLinkResearch({
    searchVideos: async () => { if (fail) throw Error('provider down'); return { videos: [] }; }, searchWeb: async () => { if (fail) throw Error('provider down'); return { organic: [] }; },
    trailerSearch: deps => async () => { try { await deps.searchVideos('query', {}); } catch { return null; } return video; },
    uzbekSearch: deps => async () => { for (const site of ['uzmovi.net', 'asilmedia.org', 'kinochilar.com', 'kino-olami.uz']) try { await deps.searchWeb(`site:${site} query`, {}); } catch { /* Actual search service isolates site failures. */ } return found; },
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
  const related = await links({ video: { ...trailer, kind: 'related' } })(draft(), AbortSignal.timeout(1000));
  assert.equal(related.movie.trailers, null); assert.ok(related.confirmedUnavailable.includes('trailers'));
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
