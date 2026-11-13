import {test} from 'node:test';import assert from 'node:assert/strict';
import {briefMovieResponse} from '../dist/ai/services/movie-brief.service.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
import {createMovieFollowup,isContextMovieFollowup,requestedMovieSection} from '../dist/ai/services/movie-followup.service.js';
import {catalogChatInput,isCatalogEligible} from '../dist/ai/catalog/utils/catalog-chat-input.js';
import {createCatalogChatProcessor} from '../dist/ai/catalog/services/catalog-chat-save.service.js';
const movie={title:'Example',titleUz:'Misol',titleRu:null,year:2005,confidence:'high',language:'uz',sources:[{title:'Film',url:'https://www.imdb.com/title/tt1234567/'}],posters:[],details:emptyDossier()};
test('a brief result still dispatches complete background enrichment and link research before save',async()=>{
 const brief={...movie,presentation:'brief',sourceResearchComplete:false};assert.equal(isCatalogEligible(brief),true);
 const input=catalogChatInput(brief,[]);assert.equal(input.movie.presentation,undefined);assert.equal(input.movie.sourceResearchComplete,false);
 const calls=[];const process=createCatalogChatProcessor({matcher:{movie:async()=>({status:'not-found',method:'checked-candidates'})},references:async()=>({genres:[],countries:[]}),enrich:async draft=>{calls.push('facts-and-actors');return draft;},links:async draft=>{calls.push('trailer-and-links');return draft;},save:async()=>{calls.push('save');return {status:'created',movieId:8009,actorIds:[],posters:[]};}});
 const result=await process(input,null,AbortSignal.timeout(1000),async()=>{});assert.equal(result.movieId,8009);assert.deepEqual(calls,['facts-and-actors','trailer-and-links','save']);
});
test('brief response has verified posters and dubbed links without researching cast, trailer or full facts',async()=>{
 const result=await briefMovieResponse(movie,AbortSignal.timeout(1000),{searchImages:async()=>({images:[{title:'Example (2005)',imageUrl:'https://cdn.example/poster.jpg'}]}),select:async candidates=>candidates,findLinks:async()=>[{title:'Misol',url:'https://asilmedia.org/123-misol.html',site:'asilmedia.org'}]});
 assert.equal(result.movie.presentation,'brief');assert.equal(result.movie.posters.length,1);assert.equal(result.movie.uzbekLinks.length,1);assert.equal(result.movie.trailer,null);assert.equal(result.movie.details.cast.length,0);assert.doesNotMatch(result.text,/Asosiy aktyorlar|Asosiy qahramonlar/);
});
test('optional media errors cannot discard a positively identified movie',async()=>{
 const result=await briefMovieResponse(movie,AbortSignal.timeout(1000),{searchImages:async()=>{throw Error('503');},select:async()=>[],findLinks:async()=>{throw Error('503');}});
 assert.equal(result.movie.title,'Example');assert.equal(result.movie.presentation,'brief');assert.deepEqual(result.movie.posters,[]);assert.deepEqual(result.movie.uzbekLinks,[]);
});

test('brief reply waits for recovered Uzbek links instead of leaving recovery to catalog enrichment',async()=>{
 let calls=0;let release;const gate=new Promise(resolve=>{release=resolve;});let completed=false;
 const link={title:'Misol',url:'https://uzmovi.net/tarjima-kinolar/123-misol.html',site:'uzmovi.net'};
 const pending=briefMovieResponse({...movie,posters:[{url:'https://cdn.example/poster.jpg'}]},AbortSignal.timeout(2000),{
  searchImages:async()=>{throw Error('stored posters must be reused');},select:async()=>[],
  findLinks:async()=>{calls++;if(calls===1)return [];await gate;return [link];},
 }).then(result=>{completed=true;return result;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,2);assert.equal(completed,false);
 release();const result=await pending;assert.deepEqual(result.movie.uzbekLinks,[link]);assert.equal(result.movie.titleUz,'Misol');
});

test('brief response reuses stored links and bounds unsuccessful searches',async()=>{
 const link={title:'Misol',url:'https://asilmedia.org/123-misol.html',site:'asilmedia.org'};let calls=0;
 const deps={searchImages:async()=>({images:[]}),select:async()=>[],findLinks:async()=>{calls++;return [];}};
 const cached=await briefMovieResponse({...movie,uzbekLinks:[link]},AbortSignal.timeout(1000),deps);
 assert.deepEqual(cached.movie.uzbekLinks,[link]);assert.equal(calls,0);
 const missing=await briefMovieResponse(movie,AbortSignal.timeout(1000),deps);
 assert.equal(calls,2);assert.deepEqual(missing.movie.uzbekLinks,[]);
});
test('context follow-ups distinguish requests about the current movie from a different named title',()=>{
 for(const text of ['Aktyorlari kimlar?','asosiy qahramonlar haqida','treylerini top','reytinglari va janrlari','shu kino haqida to‘liq ma’lumot ber','aktyorlarni rasmlari bilan yubor','show its trailer','Example aktyorlari'])assert.equal(isContextMovieFollowup(text,movie),true,text);
 assert.equal(isContextMovieFollowup('Interstellar treylerini top',movie),false);assert.equal(isContextMovieFollowup('Salom',movie),false);assert.equal(requestedMovieSection('IMDb reytingi'),'details');
});
test('a trailer follow-up uses database film identity and does not run dossier research',async()=>{
 let searches=0;const run=createMovieFollowup({lookup:async()=>[{...movie,catalogId:8008}],research:async()=>{throw Error('unnecessary full facts');},trailer:async film=>{searches++;assert.equal(film.title,'Example');return {videoId:'abcdefghijk',url:'https://www.youtube.com/watch?v=abcdefghijk',title:'Trailer',channel:null,kind:'trailer'};}});
 const result=await run('treylerini ber',movie);assert.equal(result.movie.presentation,'trailer');assert.equal(result.movie.trailer.videoId,'abcdefghijk');assert.equal(searches,1);assert.deepEqual(result.movie.posters,[]);
});
test('stored cast and characters retain their original blocks without video analysis or repeated research',async()=>{
 const details=emptyDossier();details.cast=[{name:'Actor',originalName:'Actor',role:'Hero',sources:movie.sources}];details.characters=[{name:'Hero',originalName:'Hero',description:'A character',sources:movie.sources}];
 const run=createMovieFollowup({lookup:async()=>[{...movie,catalogId:8008,details}],research:async()=>{throw Error('unnecessary search');},trailer:async()=>{throw Error('unnecessary trailer');}});
 const cast=await run('aktyorlari kimlar',movie);assert.match(cast.text,/### Asosiy aktyorlar/);assert.doesNotMatch(cast.text,/Asosiy qahramonlar/);assert.equal(cast.movie.presentation,'cast');
 const characters=await run('asosiy qahramonlar',movie);assert.match(characters.text,/### Asosiy qahramonlar/);assert.doesNotMatch(characters.text,/Asosiy aktyorlar/);
});
