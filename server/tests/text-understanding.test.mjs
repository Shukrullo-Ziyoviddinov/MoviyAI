import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isNamedMovieSearch,createTextMovieSearch} from '../dist/ai/services/text-movie.service.js';
import {isMovieDescription, movieUnderstandingPrompt} from '../dist/ai/services/text-movie-understanding.js';
import {isMovieRecommendation} from '../dist/ai/services/movie-recommendation.service.js';
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

test('long descriptions retain their ending, not just the first 4000 characters',()=>{
 const long='Bitta kino bor edi unda yigit dunyoni qutqarardi. '+ 'Boshqa sahna tafsiloti. '.repeat(250)+'Eng oxirida maxfiy kalitni dengizga tashlagan edi.';
 const context=[{role:'user',text:long},{role:'model',text:'Qaysi yillar edi?'}];
 const data=JSON.parse(movieUnderstandingPrompt('taxminan 2010 yil',context).split('\n').at(-1));
 assert.equal(data.previousUserClues[0],long);assert.match(data.previousUserClues[0],/dengizga tashlagan edi\.$/);
});
test('many follow-up clues do not evict the initial scene description',()=>{
 const context=[...history];
 for(const clue of ['taxminan 2010 yil','u hind kinosi edi','unda bir kampir ham bor edi','yana bir detal, yigitning iti ham bor edi','oxirida ular poezdda ketishardi'])context.push({role:'user',text:clue},{role:'model',text:'Tushunarli.'});
 const data=JSON.parse(movieUnderstandingPrompt('keyin yana yomgir yogardi',context).split('\n').at(-1));
 assert.equal(data.previousUserClues[0],description);assert.equal(data.previousUserClues.length,6);
});
test('a new topic breaks old scene context even without a greeting',()=>{
 const context=[...history,{role:'user',text:'Moviy AI dan qanday foydalanaman?'},{role:'model',text:'Bu yerda film izlash mumkin.'}];
 assert.equal(isNamedMovieSearch('taxminan 2010 yillarda',context),false);
});
test('another remembered film starts fresh instead of appending to the old film',()=>{
 const data=JSON.parse(movieUnderstandingPrompt('yana bir kino bor edi unda kosmonavt qora tuynukka kirardi',history).split('\n').at(-1));
 assert.deepEqual(data.previousUserClues,[]);
});
test('Russian rejection and additional-scene words use Unicode word boundaries',()=>{
 for(const text of ['нет это не тот фильм','там человек каждый день просыпается','он был пожилым'])assert.equal(isNamedMovieSearch(text,history),true,text);
});
test('preference questions stay chat or recommendations; a remembered scene is not a recommendation request',()=>{
 for(const text of ['Senga qanday kino yoqadi?','Qaysi kino yaxshi?','What is a movie?'])assert.equal(isNamedMovieSearch(text),false,text);
 assert.equal(isMovieRecommendation('qaysi kino ko‘rsam ekan'),true);
 const text='Bu qaysi kino edi, men oldin ko‘rganman unda yigit har kuni yana bir kunda uyg‘onadi';
 assert.equal(isNamedMovieSearch(text),true);assert.equal(isMovieRecommendation(text),false);
});
test('answers to specific scene or vehicle questions do not require search keywords',()=>{
 const context=[{role:'user',text:description},{role:'model',text:'Qaysi mashina yoki sahna esingizda qolgan?'}];
 assert.equal(isNamedMovieSearch('DeLorean mashinasi edi va 1985 yil bo‘lsa kerak',context),true);
 const data=JSON.parse(movieUnderstandingPrompt('DeLorean mashinasi edi va 1985 yil bo‘lsa kerak',context).split('\n').at(-1));
 assert.deepEqual(data.previousUserClues,[description]);
});
test('positive words starting with yoq are not treated as a rejection',()=>{
 const data=JSON.parse(movieUnderstandingPrompt('yoqimli film edi',[...history,{role:'model',text:'Identified film: Example (2001)'}]).split('\n').at(-1));
 assert.equal(data.rejectedPreviousTitle,null);
});
