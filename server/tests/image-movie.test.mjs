import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { dossierSchema, verifiedDossier, emptyDossier, renderMovieDossier } from '../dist/ai/services/movie-dossier.js';

const source = readFileSync(new URL('../dist/ai/services/image-movie.service.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function harness({ searchable = true, badSource = false, posterError = false, detailError = false, evidenceError = false, wrongRatingSource = false, manyPosters = false } = {}) {
  const answers = [
    { query: 'Interstellar 2014 movie', clues: ['Spacesuit', 'Interstellar title'], searchable },
    { matched: searchable, title: 'Interstellar', titleUz: null, titleRu: null, year: 2014, confidence: 'high',
      answer: searchable ? 'Interstellar (2014). Siz izlagan kino shumi?' : 'Boshqa kadr yuboring.', sourceIndexes: badSource ? [9] : [0], language:'uz' },
    {productionYears:{value:'2013',sourceIndexes:[1]},countries:{value:['AQSH'],sourceIndexes:[1]},genres:{value:['Ilmiy fantastika'],sourceIndexes:[1]},runtimeMinutes:{value:169,sourceIndexes:[1]},ageRating:{value:'PG-13 (US)',sourceIndexes:[1]},synopsis:{value:'Kosmik sayohat haqida film.',sourceIndexes:[1]},directors:{value:['Christopher Nolan'],sourceIndexes:[0]},budget:{value:'USD 165 million',sourceIndexes:[2]},boxOffice:{value:'USD 700 million',sourceIndexes:[2]},imdb:{value:8.7,sourceIndexes:[0]},kinopoisk:{value:8.6,sourceIndexes:wrongRatingSource?[0]:[3]},characters:[],cast:['Matthew McConaughey','Anne Hathaway','Jessica Chastain','Michael Caine','Mackenzie Foy'].map(name=>({name,originalName:name,role:'Role',sourceIndexes:[0]}))},
  ];
  let searches = 0, posters = 0;const calls=[];
  class GoogleGenAI { models = { generateContent: async request => {calls.push(request);if(detailError&&calls.length===3)throw Error('dossier unavailable');return { text: JSON.stringify(answers.shift()) };} }; }
  class AiServiceError extends Error {}
  const searchWeb = async query => {
    searches++;
    if(evidenceError&&searches>2)throw Error('search unavailable');
    if(query.includes('site:kinopoisk'))return {organic:[{title:'Interstellar (2014)',link:'https://www.kinopoisk.ru/film/258687/',snippet:'Rating 8.6/10'}]};
    if(query.includes('production budget'))return {organic:[{title:'Interstellar finances',link:'https://www.the-numbers.com/movie/Interstellar',snippet:'Production budget USD 165 million, worldwide box office USD 700 million.'}]};
    if(query.includes('film production')||query.includes('director plot'))return {organic:[{title:'Interstellar (2014)',link:'https://en.wikipedia.org/wiki/Interstellar_(film)',snippet:'2013 production, 169 minutes, USA, Science fiction. PG-13. Space journey.'}]};
    return {organic:[{title:'Interstellar (2014)',link:'https://www.imdb.com/title/tt0816692/',snippet:query.includes('IMDb rating')?'IMDb RATING 8.7/10':query.includes('top 5 cast')?'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine, Mackenzie Foy.':'Directed by Christopher Nolan.'}]};
  };
  const searchImages = async (_query, options) => { posters++; if(options.num===15)throw Object.assign(Error('Unsupported Serper image result count'),{status:400}); if (posterError) throw Error('unavailable'); return { images: manyPosters ? [{imageUrl:'https://example.com/tiny.jpg',imageWidth:80,imageHeight:100},{imageUrl:'https://example.com/wrong.jpg',title:'Interstellar 2025'},...Array.from({length:10},(_,index)=>({imageUrl:'https://example.com/poster-'+index+'.jpg',title:'Interstellar 2014',imageWidth:1000,imageHeight:1500})),{imageUrl:'https://example.com/poster-0.jpg'}] : [
    { imageUrl: 'https://example.com/poster.jpg', link: 'https://example.com/movie' }, { imageUrl: 'http://127.0.0.1/private' },
  ] }; };
  const api = new Function('GoogleGenAI', 'z', 'AI_CONFIG', 'AiServiceError', 'searchWeb', 'searchImages', 'dossierSchema', 'verifiedDossier', 'emptyDossier', 'renderMovieDossier', 'findMovieTrailer', 'findUzbekMovieLinks', source + '\nreturn {findMovieFromImages,publicHttpsUrl};')
    (GoogleGenAI, z, { apiKey: 'test', models: { image: 'gemini-3.5-flash-lite' } }, AiServiceError, searchWeb, searchImages, dossierSchema, verifiedDossier, emptyDossier, renderMovieDossier, async()=>({videoId:'zSWdZVtXT7E',url:'https://www.youtube.com/watch?v=zSWdZVtXT7E',title:'Interstellar trailer',channel:'Warner Bros.',kind:'trailer'}),async()=>[{title:'Interstellar Uzbek',url:'https://uzmovi.net/123-interstellar.html',site:'uzmovi.net'}]);
  return { ...api, calls, searches: () => searches, posters: () => posters };
}
const images = [{ mimeType: 'image/jpeg', data: Buffer.from([255, 216, 255]) }];
test('image clues drive search and only supplied sources/posters are returned', async () => {
  const h = harness(), result = await h.findMovieFromImages('Bu qaysi kino?', images);
  assert.equal(result.model, 'gemini-3.5-flash-lite'); assert.equal(h.searches(), 10); assert.equal(h.posters(), 1);
  assert.equal(result.movie.title, 'Interstellar'); assert.equal(result.movie.titleUz, 'Interstellar Uzbek'); assert.equal(result.movie.uzbekLinks[0].site,'uzmovi.net');
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
 assert.equal(h.calls.length,3);for(const call of h.calls.slice(0,2)){const part=call.contents[0].parts[0];assert.equal(part.fileData.fileUri,fileUri);assert.equal(part.inlineData,undefined);}
});

test('dossier includes supported facts, five actors and both official ratings',async()=>{
 const h=harness(),result=await h.findMovieFromImages('Find',images);
 assert.equal(result.movie.details.cast.length,5);assert.equal(result.movie.details.runtimeMinutes.value,169);
 assert.equal(result.movie.details.imdb.value,8.7);assert.equal(result.movie.details.kinopoisk.value,8.6);
 assert.equal(result.movie.details.budget.value,'USD 165 million');assert.doesNotMatch(result.text,/Budjet/);assert.match(result.text,/Matthew McConaughey/);assert.match(result.text,/Siz izlagan kino shumi/);
 const evidence=JSON.parse(h.calls[2].contents[0].parts[0].text).sources;assert.match(evidence[0].snippet,/Directed by/);assert.match(evidence[0].snippet,/8.7/);
});
test('ratings from the wrong site are suppressed',async()=>{
 const result=await harness({wrongRatingSource:true}).findMovieFromImages('Find',images);assert.equal(result.movie.details.kinopoisk.value,null);assert.doesNotMatch(result.text,/8\.6 \/ 10/);
});
test('optional dossier and evidence failures keep identification and mark missing facts',async()=>{
 for(const options of [{detailError:true},{evidenceError:true}]){
 const result=await harness(options).findMovieFromImages('Find',images);assert.equal(result.movie.title,'Interstellar');assert.match(result.text,/Siz izlagan kino shumi/);
 if(options.detailError)assert.equal(result.movie.details.cast.length,0);
 }
});

test('poster search returns up to two unique images and skips small images or wrong years',async()=>{const result=await harness({manyPosters:true}).findMovieFromImages('Find',images);assert.equal(result.movie.posters.length,2);assert.equal(new Set(result.movie.posters.map(item=>item.url)).size,2);assert.ok(result.movie.posters.every(item=>item.url.includes('poster-')));});
