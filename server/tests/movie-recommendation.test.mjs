import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMovieRecommendations,isMovieRecommendation} from '../dist/ai/services/movie-recommendation.service.js';
const movie=title=>({title,titleUz:null,titleRu:null,year:2014,confidence:'high',sources:[{title,url:'https://example.com/film'}],posters:[]});
test('recommendations research every selected movie and preserve order despite one failed lookup',async()=>{
 const calls=[],deltas=[];
 const recommend=createMovieRecommendations({generate:async()=>({model:'gemma',text:JSON.stringify({intro:'Tavsiyalar',movies:[{title:'One',year:2014},{title:'Two',year:2015},{title:'Three',year:2016}]})}),find:async(text,delta,signal)=>{
  calls.push(text);assert.ok(signal instanceof AbortSignal);assert.equal(delta,undefined);
  if(text.includes('Two'))throw Error('provider failed');return {text:'Sourced dossier',model:'test',movie:movie(text.includes('One')?'One':'Three')};
 }});
 const result=await recommend('Kino tavsiya qil',[],delta=>deltas.push(delta));
 assert.equal(calls.length,3);assert.deepEqual(result.recommendations.map(item=>item.movie.title),['One','Three']);assert.equal(deltas.join(''),result.text);assert.match(result.text,/1 ta tavsiya/);
});
test('duplicate recommendations do not trigger duplicate searches and unverified results are not presented as movie cards',async()=>{
 let searches=0;
 const recommend=createMovieRecommendations({generate:async()=>({model:'gemma',text:JSON.stringify({intro:'Tavsiyalar',movies:[{title:'One',year:2014},{title:'one',year:2014}]})}),find:async()=>{searches++;return {text:'Unknown',model:'test'};}});
 await assert.rejects(()=>recommend('Kino tavsiya qil'),/SEARCH_UNAVAILABLE/);assert.equal(searches,1);
});
test('movie recommendation requests are recognized in three languages',()=>{
 for(const text of ['fantastik kino tavsiya qil','Recommend some films','Посоветуй фильм'])assert.equal(isMovieRecommendation(text),true);
 for(const text of ['salom','Spider-Man 2 kinosini top'])assert.equal(isMovieRecommendation(text),false);
});
test('temporary planning failure retries the same model once and unrelated requests do not start film searches',async()=>{
 const models=[];
 const recommend=createMovieRecommendations({generate:async(model)=>{models.push(model);if(models.length===1)throw Object.assign(Error('temporary'),{status:500});return {model,text:JSON.stringify({intro:'Cinema only',movies:[]})};},find:async()=>{throw Error('must not search');}});
 assert.equal((await recommend('recipe tavsiya qil')).recommendations.length,0);
 assert.equal(models.length,2);assert.equal(models[0],models[1]);
});
