import {test} from 'node:test';import assert from 'node:assert/strict';
import {storeMoviePosters} from '../dist/ai/catalog/services/catalog-poster.service.js';
test('failed supplied posters trigger fresh search and only uploaded assets are returned',async()=>{
 const calls=[];let searches=0;
 const media={store:async(folder,urls)=>{calls.push(urls);if(calls.length===1)throw Error('expired image');return [{key:'movieimg/real.jpg',path:'/img/real.jpg',sourceUrl:urls[0]}];}};
 const result=await storeMoviePosters(media,{originalTitle:'Example',year:2005},['https://old.example/poster.jpg'],()=>{},AbortSignal.timeout(1000),async()=>{searches++;return {images:[{title:'Example (2005)',imageUrl:'https://cdn.example/valid.jpg',imageWidth:500,imageHeight:750},{title:'Example (1995)',imageUrl:'https://cdn.example/wrong.jpg'}]};});
 assert.equal(searches,1);assert.deepEqual(calls[1],['https://cdn.example/valid.jpg']);assert.equal(result[0].path,'/img/real.jpg');
});
test('a valid existing candidate avoids another paid image search',async()=>{
 const assets=[{key:'movieimg/real.jpg',path:'/img/real.jpg',sourceUrl:'https://cdn.example/real.jpg'}];
 assert.deepEqual(await storeMoviePosters({store:async()=>assets},{originalTitle:'Example',year:2005},[assets[0].sourceUrl],()=>{},AbortSignal.timeout(1000),async()=>{throw Error('unnecessary search');}),assets);
});
