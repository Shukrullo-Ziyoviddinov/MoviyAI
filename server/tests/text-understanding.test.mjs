import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isNamedMovieSearch,createTextMovieSearch} from '../dist/ai/services/text-movie.service.js';
import {isMovieDescription, movieUnderstandingPrompt} from '../dist/ai/services/text-movie-understanding.js';
const description='man ber kino kurgandim unda bola sehrli maktabga borardi nomi esimda yuq';
const history=[{role:'user',text:description},{role:'model',text:'Taxminan qaysi yillarda ko‘rgansiz?'}];
test('remembered scenes in colloquial Uzbek, Russian and English reach the existing movie lookup without a search verb',()=>{
 for(const value of [description,'Bitta kino bor edi, unda yigit vaqtni ortga qaytarardi','Bir kinoda bola maktabga boradi va sehr o‘rganadi','bir yigit tushlarda yurardi bu qaysikino edi','Помню фильм, где человек просыпается в один и тот же день','A movie where a boy goes to a school for wizards'])assert.equal(isNamedMovieSearch(value),true,value);
 for(const value of ['salom','rahmat','menga yaxshi kino top','Interstellar haqida gapir','Men kino haqida gaplashmoqchiman','Mening ismim nima?'])assert.equal(isMovieDescription(value),false,value);
});
test('a year, country or actor clue follows the same remembered-film context',()=>{
 for(const text of ['taxminan 2010 yillarda edi','u hind kinosi edi','yoq sehrgar emas edi','Rayan Gosling o‘ynagan'])assert.equal(isNamedMovieSearch(text,history),true,text);
 for(const text of ['salom','rahmat','mening ismim nima'])assert.equal(isNamedMovieSearch(text,history),false,text);
 assert.equal(isNamedMovieSearch('taxminan 2010 yillarda edi'),false);
 assert.equal(isNamedMovieSearch('u hind kinosi edi',[...history,{role:'user',text:'salom'},{role:'model',text:'Salom!'}]),false);
});
test('a short actor answer is understood after an actual actor clarification',()=>{
 assert.equal(isNamedMovieSearch('Leonardo DiCaprio',[...history,{role:'model',text:'Qaysi aktyor esingizda qolgan?'}]),true);
});
test('context supplies human clues only and preserves negations and uncertain years',()=>{
 const prompt=movieUnderstandingPrompt('yoq u sehrgar emas edi, 2005 bo‘lsa kerak',history);
 const data=JSON.parse(prompt.split('\n').at(-1));assert.deepEqual(data.previousUserClues,[description]);
 assert.equal(data.latestUserMessage,'yoq u sehrgar emas edi, 2005 bo‘lsa kerak');
 assert.match(prompt,/negation/);assert.match(prompt,/uncertain/);assert.doesNotMatch(prompt,/Taxminan qaysi/);
});
test('a fresh description never inherits an unrelated film or the model\'s guessed title',()=>{
 const prompt=movieUnderstandingPrompt('Bitta boshqa kino bor edi unda robotlar odamlar bilan urushardi',[...history,{role:'model',text:'Maybe it was Harry Potter?'}]);
 assert.deepEqual(JSON.parse(prompt.split('\n').at(-1)).previousUserClues,[]);assert.doesNotMatch(prompt,/Harry Potter/);
});
test('a rejected earlier result is marked as excluded, not as a positive scene clue',()=>{
 const prompt=movieUnderstandingPrompt('yoq u kino emas edi',[...history,{role:'model',text:'Found movie.\nIdentified film: Example (2001)'}]);
 const data=JSON.parse(prompt.split('\n').at(-1));assert.equal(data.rejectedPreviousTitle,'Example (2001)');assert.deepEqual(data.previousUserClues,[description]);
});
test('prepared text uses the unchanged lookup once, preserving streaming, stop signal and no media',async()=>{
 const signal=new AbortController().signal,delta=()=>{};let calls=0;
 const find=createTextMovieSearch({find:async(text,media,onDelta,passedSignal)=>{
  calls++;assert.equal(onDelta,delta);assert.equal(passedSignal,signal);assert.deepEqual(media,[]);
  assert.deepEqual(JSON.parse(text.split('\n').at(-1)).previousUserClues,[description]);
  return {text:'Found',model:'test'};
 }});
 assert.equal((await find('u hind kinosi edi',delta,signal,history)).text,'Found');assert.equal(calls,1);
});
