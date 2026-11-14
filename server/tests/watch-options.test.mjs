import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchOptions} from '../dist/utils/watch-options.js';
import {prepareCatalogDraft} from '../dist/ai/catalog/mappers/movie.mapper.js';
import {prepareMovieUpdate} from '../dist/ai/catalog/utils/catalog-movie-update.js';

const first='https://asilmedia.org/123-example.html',second='https://uzmovi.net/123-example.html';
const result={title:'Example',titleUz:'Misol',titleRu:null,year:2014,confidence:'high',sources:[{title:'Film',url:'https://example.com/film'}],posters:[],uzbekLinks:[{url:first,title:'Misol',site:'asilmedia.org'},{url:second,title:'Misol',site:'uzmovi.net'},{url:first,title:'Misol',site:'asilmedia.org'}]};
test('all verified alternatives map to the database payload without duplicates',()=>{
 const draft=prepareCatalogDraft(result,{language:'uz'});
 assert.equal(draft.movie.watchUrl,first);assert.deepEqual(draft.movie.watchUrls,[first,second]);
 const next=prepareCatalogDraft({...result,uzbekLinks:result.uzbekLinks.slice(1,2)},{language:'uz'}).movie;
 const {updates}=prepareMovieUpdate({...draft.movie,like:'8'},next);
 assert.deepEqual(updates.watchUrls,[first,second]);assert.equal(updates.watchUrl,first);assert.equal(updates.like,undefined);
});
test('detail restores legacy research alternatives, stores their union and never exposes private research',async()=>{
 const row={id:8001,watchUrl:first,watchUrls:[],catalogResearch:{result:{uzbekLinks:result.uzbekLinks},privateField:'private'}};
 let writes=0;
 const Movie={findOne:()=>({select(){return this;},lean:async()=>structuredClone(row)}),updateOne:async(filter,patch)=>{
  writes++;assert.deepEqual(filter,{id:8001});row.watchUrls=[...new Set([...row.watchUrls,...patch.$addToSet.watchUrls.$each])];
 }};
 const source=readFileSync(new URL('../dist/services/movie.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
 const getMovie=new Function('Movie','watchOptions',source+'\nreturn getMovieById;')(Movie,watchOptions);
 const saved=await getMovie(8001);assert.deepEqual(saved.watchUrls,[first,second]);assert.equal(saved.catalogResearch,undefined);assert.equal(writes,1);
 await getMovie(8001);assert.equal(writes,1);
});
test('legacy single links stay usable and unsafe protocols are excluded',()=>{
 assert.deepEqual(watchOptions({watchUrl:first}),[{url:first,domain:'asilmedia.org'}]);
 assert.deepEqual(watchOptions({watchUrls:['javascript:alert(1)','file:///secret','https://user:pass@example.com',first+'#fragment',first]}),[{url:first,domain:'asilmedia.org'}]);
});
