import test from 'node:test';
import assert from 'node:assert/strict';
import { movieIdentitySources, identityIds } from '../dist/ai/catalog/utils/catalog-identity.js';
import { prepareCatalogDraft } from '../dist/ai/catalog/mappers/movie.mapper.js';
import { createCatalogChatProcessor } from '../dist/ai/catalog/services/catalog-chat-save.service.js';
test('another sequel cannot supply identity; mobile IMDb is recognized', () => {
  const sources = [
    { title: 'Wrong Turn 3: Left for Dead', url: 'https://m.imdb.com/title/tt1261978/' },
    { title: 'Wrong Turn 4: Bloody Beginnings', url: 'https://www.kinopoisk.ru/film/586138/' },
  ];
  const filtered = movieIdentitySources(sources, ['Wrong Turn 3: Left for Dead']);
  assert.equal(filtered.length, 1);
  assert.deepEqual(identityIds(filtered, 'movie'), { imdbId: 'tt1261978', kinopoiskId: null });
  assert.equal(movieIdentitySources([sources[1]], ['Wrong Turn 4']).length, 1);
});

test('retry sanitizes a legacy checkpoint before duplicate matching without losing movie data', async () => {
  const movie = { title: 'Wrong Turn 3: Left for Dead', year: 2009, confidence: 'high', sources: [
    { title: 'Wrong Turn 3: Left for Dead', url: 'https://m.imdb.com/title/tt1261978/' },
    { title: 'Wrong Turn 4: Bloody Beginnings', url: 'https://www.kinopoisk.ru/film/586138/' },
  ], posters: [] };
  const draft = prepareCatalogDraft(movie, { language: 'uz' });
  draft.identity.kinopoiskId = '586138';
  draft.research.identitySources = structuredClone(movie.sources);
  draft.movie.actorIds = [9001];
  const process = createCatalogChatProcessor({
    matcher: { movie: async identity => {
      assert.equal(identity.kinopoiskId, null);
      assert.equal(identity.imdbId, 'tt1261978');
      assert.equal(identity.sources.length, 1);
      return { status: 'existing', id: 8037, method: 'external-id' };
    } },
    refresh: async (_id, _input, _signal, saved) => {
      assert.deepEqual(saved.movie.actorIds, [9001]);
      assert.equal(saved.identity.kinopoiskId, null);
      return { status: 'existing', movieId: 8037 };
    },
  });
  const result = await process({ movie, language: 'uz' }, draft, new AbortController().signal, async () => {});
  assert.equal(result.movieId, 8037);
  assert.equal(draft.identity.kinopoiskId, '586138');
});
