import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isNamedMovieSearch} from '../dist/ai/services/text-movie.service.js';

test('explicit named movie requests use sourced lookup while greetings and follow-ups keep their routes',()=>{
 for(const text of ['O‘rgimchak odam 2 kinosini top','Interstellar 2014 top','Spider-Man 2 o‘zbekcha havolasini top','Find Spider-Man 2','Найди фильм Человек-паук 2'])assert.equal(isNamedMovieSearch(text),true,text);
 for(const text of ['salom','mening ismim nima','Interstellar haqida gapir','menga yaxshi kino top','shu kinoni top','uzbekcha dublaji ham top','havolasini ber'])assert.equal(isNamedMovieSearch(text),false,text);
});
