import {test} from 'node:test';import assert from 'node:assert/strict';
import {readStructuredMovieFacts} from '../dist/ai/services/movie-page-facts.js';
import {readMovieSource,createMovieSourceResearch} from '../dist/ai/services/movie-source-research.service.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
const source={title:'Example (2005)',url:'https://www.imdb.com/title/tt1234567/'};
const film={title:'Example',year:2005};
const markup=data=>`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const movie={'@type':'Movie',name:'Example',datePublished:'2005-09-11',countryOfOrigin:[{'@type':'Country',name:'United Kingdom'}],genre:['Drama','Romance'],description:'A &amp; B discover a mystery.',director:{name:'A Director'},actor:[{name:'An Actor'}],duration:'PT2H7M',aggregateRating:{ratingValue:7.8,bestRating:10}};
test('literal page facts use exact title/year and preserve source identity without AI',()=>{
 const details=readStructuredMovieFacts(markup(movie),source,film);assert.equal(details.runtimeMinutes.value,127);assert.equal(details.imdb.value,7.8);assert.equal(details.synopsis.value,'A & B discover a mystery.');assert.deepEqual(details.countries.value,['United Kingdom']);assert.equal(details.cast[0].role,null);assert.equal(details.cast[0].sources[0].url,source.url);
 for(const wrong of [{...film,year:1995},{...film,title:'Example 2'},{...film,year:null}])assert.equal(readStructuredMovieFacts(markup(movie),source,wrong),null);
});
test('ratings are not converted from five stars or copied from unrelated source domains',()=>{
 assert.equal(readStructuredMovieFacts(markup({...movie,aggregateRating:{ratingValue:4,bestRating:5}}),source,film).imdb.value,null);
 assert.equal(readStructuredMovieFacts(markup(movie),{...source,url:'https://en.wikipedia.org/wiki/Example'},film).imdb.value,null);
});
test('multiple script blocks and schema graphs survive the page reader and extraction outage',async()=>{
 const html=markup({'@type':'WebSite'})+markup({'@graph':[movie]});
 const read=await readMovieSource(source,AbortSignal.timeout(1000),async()=>new Response(html,{headers:{'content-type':'text/html'}}));
 const research=createMovieSourceResearch({searchWeb:async()=>({organic:[]}),read:async()=>read});
 const details=await research(film,[source],emptyDossier(),async()=>{throw Object.assign(Error('busy'),{status:503});},AbortSignal.timeout(1000));
 assert.equal(details.imdb.value,7.8);assert.equal(details.runtimeMinutes.value,127);assert.equal(details.cast.length,1);
 assert.equal(details.synopsis.value,null); // English markup must not become an untranslated Uzbek answer.
});

test('structured cast names can gain sourced roles while synopsis still goes through localization',async()=>{
 const read=await readMovieSource(source,AbortSignal.timeout(1000),async()=>new Response(markup(movie),{headers:{'content-type':'text/html'}}));
 const research=createMovieSourceResearch({searchWeb:async()=>({organic:[]}),read:async()=>read});
 const details=await research(film,[source],emptyDossier(),async(_evidence,known)=>{assert.equal(known.synopsis.value,null);const result=emptyDossier();result.synopsis={value:'Tarjima qilingan mazmun.',sources:[source]};result.cast=[{name:'An Actor',originalName:'An Actor',role:'Hero',sources:[source]}];return result;},AbortSignal.timeout(1000));
 assert.equal(details.synopsis.value,'Tarjima qilingan mazmun.');assert.equal(details.cast[0].role,'Hero');
});
