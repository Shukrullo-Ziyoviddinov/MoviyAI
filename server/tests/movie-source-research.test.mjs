import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMovieSourceResearch,readMovieSource,hasCoreMovieFacts} from '../dist/ai/services/movie-source-research.service.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
const imdb={title:'Spider-Man 2 (2004)',url:'https://www.imdb.com/title/tt0316654/',snippet:'Movie'};
const wiki={title:'Spider-Man 2',url:'https://en.wikipedia.org/wiki/Spider-Man_2',snippet:'Movie'};
const tmdb={title:'Spider-Man 2',url:'https://www.themoviedb.org/movie/558-spider-man-2',snippet:'Movie'};
test('a transient extraction failure retries the same already-read page without another paid search',async()=>{
 let extracts=0,reads=0;
 const research=createMovieSourceResearch({searchWeb:async()=>{throw Error('unexpected search');},read:async source=>{reads++;return source;}});
 const result=await research({title:'Spider-Man 2',year:2004},[imdb],emptyDossier(),async()=>{extracts++;if(extracts===1)throw Object.assign(Error('busy'),{status:503});return complete();},AbortSignal.timeout(1000));
 assert.equal(extracts,2);assert.equal(reads,1);assert.equal(hasCoreMovieFacts(result),true);
});
function complete(){const d=emptyDossier();for(const [key,value] of Object.entries(d))if(value&&typeof value==='object'&&!Array.isArray(value)&&'value'in value)d[key]={value:'known',sources:[imdb]};d.cast=[{name:'Actor',originalName:'Actor',role:'Role',sources:[imdb]}];d.characters=[{name:'Hero',originalName:'Hero',description:null,sources:[imdb]}];return d;}
test('empty research cannot be marked complete; explicit infobox country survives extraction failure',async()=>{
 assert.equal(hasCoreMovieFacts(emptyDossier()),false);assert.equal(hasCoreMovieFacts(complete()),true);
 const initial=complete();initial.countries={value:null,sources:[]};
 const research=createMovieSourceResearch({searchWeb:async()=>({organic:[]}),read:async source=>({...source,pageFacts:{title:'Spider-Man 2',year:2004,countries:['United States']}})});
 const result=await research({title:'Spider-Man 2',year:2004},[wiki],initial,async()=>{throw Object.assign(Error('provider down'),{status:503});},AbortSignal.timeout(1000));
 assert.deepEqual(result.countries.value,['United States']);
});

test('an explicit unique IMDb score survives an unavailable AI extractor',async()=>{
 const research=createMovieSourceResearch({searchWeb:async()=>({organic:[{title:imdb.title,link:imdb.url,snippet:'IMDb RATING 7.8/10 385K'}]}),read:async source=>source});
 const result=await research({title:'Spider-Man 2',year:2004},[imdb],emptyDossier(),async()=>{throw Object.assign(Error('busy'),{status:503});},AbortSignal.timeout(1000));
 assert.equal(result.imdb.value,7.8);assert.equal(result.imdb.sources[0].url,imdb.url);
});
test('complete first source stops further reads after one bounded rating search',async()=>{
 const reads=[];let searches=0;
 const research=createMovieSourceResearch({searchWeb:async()=>{searches++;return {organic:[]};},read:async source=>{reads.push(source.url);return source;}});
 await research({title:'Spider-Man 2',year:2004},[imdb,wiki,tmdb],emptyDossier(),async()=>complete(),AbortSignal.timeout(1000));
 assert.deepEqual(reads,[imdb.url]);assert.equal(searches,1);
});
test('sources run sequentially and later sources fill only missing fields',async()=>{
 const reads=[],initial=complete();initial.countries={value:null,sources:[]};
 const research=createMovieSourceResearch({searchWeb:async()=>{throw Error('existing URLs must be reused');},read:async source=>{reads.push(source.url);return source;}});
 const result=await research({title:'Spider-Man 2',year:2004},[imdb,wiki,tmdb],initial,async([source],known)=>{
  assert.equal(known.synopsis.value,'known');const found=emptyDossier();found.synopsis={value:'overwrite forbidden',sources:[source]};if(source.url===wiki.url)found.countries={value:['USA'],sources:[wiki]};return found;
 },AbortSignal.timeout(1000));
 assert.deepEqual(reads,[imdb.url,wiki.url]);assert.deepEqual(result.countries.value,['USA']);assert.equal(result.synopsis.value,'known');assert.equal(initial.countries.value,null);
});
test('TMDB is read only after earlier sources leave a fact missing',async()=>{
 const reads=[],initial=complete();initial.countries={value:null,sources:[]};
 const research=createMovieSourceResearch({searchWeb:async()=>({organic:[]}),read:async source=>{reads.push(source.url);return source;}});
 const result=await research({title:'Spider-Man 2',year:2004},[imdb,wiki,tmdb],initial,async([source])=>{const d=emptyDossier();if(source.url===tmdb.url)d.countries={value:['USA'],sources:[source]};return d;},AbortSignal.timeout(1000));
 assert.deepEqual(reads,[imdb.url,wiki.url,tmdb.url]);assert.deepEqual(result.countries.value,['USA']);
});
test('page reader rejects private redirects and extracts infobox/JSON-LD page content',async()=>{
 const signal=AbortSignal.timeout(1000);let calls=0;
 assert.equal(await readMovieSource(imdb,signal,async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});}),null);assert.equal(calls,1);
 const result=await readMovieSource(wiki,signal,async()=>new Response('<script type="application/ld+json">{"@type":"Movie","name":"Spider-Man 2"}</script><table class="infobox"><tr><td>Country</td><td>United States</td></tr></table>',{headers:{'content-type':'text/html'}}));
 assert.match(result.snippet,/United States/);assert.match(result.snippet,/@type/);
});
