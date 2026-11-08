import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

const source = readFileSync(new URL('../dist/ai/services/image-movie.service.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function harness({ searchable = true, badSource = false, posterError = false } = {}) {
  const answers = [
    { query: 'Interstellar 2014 movie', clues: ['Spacesuit', 'Interstellar title'], searchable },
    { matched: searchable, title: 'Interstellar', titleUz: null, titleRu: null, year: 2014, confidence: 'high',
      answer: searchable ? 'Interstellar (2014). Siz izlagan kino shumi?' : 'Boshqa kadr yuboring.', sourceIndexes: badSource ? [9] : [0] },
  ];
  let searches = 0, posters = 0;const calls=[];
  class GoogleGenAI { models = { generateContent: async request => {calls.push(request);return { text: JSON.stringify(answers.shift()) };} }; }
  class AiServiceError extends Error {}
  const searchWeb = async () => { searches++; return { organic: [{ title: 'Interstellar (2014)', link: 'https://www.imdb.com/title/tt0816692/', snippet: 'Directed by Christopher Nolan.' }] }; };
  const searchImages = async () => { posters++; if (posterError) throw Error('unavailable'); return { images: [
    { imageUrl: 'https://example.com/poster.jpg', link: 'https://example.com/movie' }, { imageUrl: 'http://127.0.0.1/private' },
  ] }; };
  const api = new Function('GoogleGenAI', 'z', 'AI_CONFIG', 'AiServiceError', 'searchWeb', 'searchImages', source + '\nreturn {findMovieFromImages,publicHttpsUrl};')
    (GoogleGenAI, z, { apiKey: 'test', models: { image: 'gemini-3.5-flash-lite' } }, AiServiceError, searchWeb, searchImages);
  return { ...api, calls, searches: () => searches, posters: () => posters };
}
const images = [{ mimeType: 'image/jpeg', data: Buffer.from([255, 216, 255]) }];
test('image clues drive search and only supplied sources/posters are returned', async () => {
  const h = harness(), result = await h.findMovieFromImages('Bu qaysi kino?', images);
  assert.equal(result.model, 'gemini-3.5-flash-lite'); assert.equal(h.searches(), 2); assert.equal(h.posters(), 1);
  assert.equal(result.movie.title, 'Interstellar'); assert.equal(result.movie.titleUz, null);
  assert.equal(result.movie.sources[0].url, 'https://www.imdb.com/title/tt0816692/'); assert.equal(result.movie.posters.length, 1);
});
test('unrecognizable images request more evidence without unnecessary searches', async () => {
  const h = harness({ searchable: false }), result = await h.findMovieFromImages('Find movie', images);
  assert.equal(h.searches(), 0); assert.equal(h.posters(), 0); assert.equal(result.movie, undefined);
  assert.match(result.text, /Boshqa kadr/);
});
test('unsupported model match cannot be presented as a verified movie', async () => {
  const h = harness({ badSource: true }), result = await h.findMovieFromImages('Find movie', images);
  assert.equal(result.movie, undefined); assert.match(result.text, /aniqlay olmadim/); assert.equal(h.posters(), 0);
});
test('poster failure keeps a sourced identification usable', async () => {
  const result = await harness({ posterError: true }).findMovieFromImages('Find movie', images);
  assert.equal(result.movie.title, 'Interstellar'); assert.equal(result.movie.posters.length, 0);
});
test('unsafe source/image URLs are rejected', () => {
  const h = harness();
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://127.0.0.1/x', 'https://10.0.0.1/x', 'https://user:pass@example.com/x']) assert.equal(h.publicHttpsUrl(url), null);
});

test('signed R2 URLs are passed to Gemini as fileData without inline image bytes',async()=>{
 const h=harness();const fileUri='https://r2.example/frame?signature=test';await h.findMovieFromImages('Find',[{mimeType:'image/jpeg',fileUri}]);
 assert.equal(h.calls.length,2);for(const call of h.calls){const part=call.contents[0].parts[0];assert.equal(part.fileData.fileUri,fileUri);assert.equal(part.inlineData,undefined);}
});
