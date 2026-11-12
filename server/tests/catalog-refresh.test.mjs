import {test} from 'node:test';import assert from 'node:assert/strict';
import {mergeMissing,missingValuePaths} from '../dist/ai/catalog/utils/catalog-merge-missing.js';
import {createCatalogChatProcessor} from '../dist/ai/catalog/services/catalog-chat-save.service.js';
import {prepareCatalogDraft} from '../dist/ai/catalog/mappers/movie.mapper.js';
import {prepareMovieUpdate} from '../dist/ai/catalog/utils/catalog-movie-update.js';
test('strict updates exclude MongoDB metadata and preserve reaction counters',()=>{
 const input=prepareCatalogDraft({title:'Example',titleUz:null,titleRu:null,year:2004,confidence:'high',sources:[],posters:[]},{language:'uz'}).movie;
 const row={...input,_id:'mongo-id',id:8007,like:'12',dislike:'3',homeImgPoster:'/img/stored.webp',title:{...input.title,_id:'nested-id'},catalogResearch:{result:{}}};
 const {updates}=prepareMovieUpdate(row,input);assert.equal(updates.homeImgPoster,'/img/stored.webp');
 for(const key of ['like','dislike','_id','id','catalogResearch'])assert.equal(key in updates,false);assert.equal('_id'in updates.title,false);
});
test('existing movie fills missing facts without overwriting known values, actor IDs or saved posters',()=>{
 const old={ratingImdb:0,categoryName:null,genre:{uz:[],ru:[]},description:{uz:{text:null},ru:{text:'Admin text'}},homeImgPoster:'/saved.webp',actorIds:[9001]};
 const incoming={ratingImdb:7,categoryName:'animationMovies',genre:{uz:['Animatsiya'],ru:['Анимация']},description:{uz:{text:'Verified plot'},ru:{text:'New translation'}},homeImgPoster:null,actorIds:[9002]};
 const result=mergeMissing(old,incoming);assert.equal(result.ratingImdb,0);assert.equal(result.homeImgPoster,'/saved.webp');assert.deepEqual(result.actorIds,[9001]);assert.equal(result.categoryName,'animationMovies');assert.equal(result.description.uz.text,'Verified plot');assert.equal(result.description.ru.text,'Admin text');assert.equal(old.categoryName,null);assert.deepEqual(missingValuePaths(result),[]);
});
test('a duplicate movie result invokes missing-fact refresh rather than silently discarding new research',async()=>{
 const movie={title:'Example',titleUz:null,titleRu:null,year:2004,confidence:'high',sources:[{title:'Example',url:'https://en.wikipedia.org/wiki/Example'}],posters:[]};let calls=0;
 const process=createCatalogChatProcessor({matcher:{movie:async()=>({status:'existing',id:8007,method:'title-year'})},references:async()=>{throw Error('not a new movie');},enrich:async()=>{throw Error('wrong flow');},links:async()=>{throw Error('wrong flow');},save:async()=>{throw Error('must not create duplicate');},refresh:async(id,input)=>{calls++;assert.equal(id,8007);assert.equal(input.movie.title,'Example');return {status:'existing',movieId:id};}});
 const result=await process({movie,language:'uz',actorImages:[]},null,AbortSignal.timeout(1000),async()=>{});assert.equal(result.movieId,8007);assert.equal(calls,1);
});
