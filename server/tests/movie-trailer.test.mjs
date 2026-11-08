import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/ai/services/movie-trailer.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
function harness(results){let calls=0;const searchVideos=async()=>{const result=results[calls++];if(result instanceof Error)throw result;return {videos:result??[]};};const api=new Function('searchVideos',source+'\nreturn {findMovieTrailer,youtubeVideoId};')(searchVideos);return {...api,calls:()=>calls};}
const movie={title:'Interstellar',year:2014};const video=(title,channel='Film channel',id='zSWdZVtXT7E')=>({title,channel,link:'https://www.youtube.com/watch?v='+id});
test('studio trailer outranks other videos and avoids unnecessary fallback searches',async()=>{
 const h=harness([[video('Interstellar 2014 clip'),video('Interstellar Official Trailer','Warner Bros. UK & Ireland')]]);const result=await h.findMovieTrailer(movie);assert.equal(result.kind,'trailer');assert.equal(result.channel,'Warner Bros. UK & Ireland');assert.equal(h.calls(),1);
});
test('fallback accepts a related film video without labelling it a trailer',async()=>{
 const h=harness([[],[video('Interstellar (2014) review')]]);const result=await h.findMovieTrailer(movie);assert.equal(result.kind,'related');assert.equal(h.calls(),2);
});
test('unrelated titles, wrong versions, fake trailers and non-YouTube links are rejected',async()=>{
 const h=harness([[video('Interstellar 2027 Official Trailer'),video('Interstellar 2 Official Trailer'),video('Interstellar (2014) Fanmade Trailer'),video('Other film 2014 trailer'),{title:'Interstellar 2014',link:'https://youtube.com.evil.example/watch?v=zSWdZVtXT7E'}],[]]);assert.equal(await h.findMovieTrailer(movie),null);
});
test('provider failure cannot break the movie answer and valid first results survive fallback failure',async()=>{
 assert.equal(await harness([Error('offline'),Error('offline')]).findMovieTrailer(movie),null);
 const result=await harness([[video('Interstellar 2014 trailer')],Error('offline')]).findMovieTrailer(movie);assert.equal(result.kind,'trailer');
});
test('only scoped YouTube URLs and 11-character ids are accepted',()=>{
 const h=harness([]);assert.equal(h.youtubeVideoId('https://youtu.be/zSWdZVtXT7E'),'zSWdZVtXT7E');
 for(const url of ['javascript:alert(1)','https://evil.com/watch?v=zSWdZVtXT7E','https://www.youtube.com/watch?v=bad','https://user:pass@youtube.com/watch?v=zSWdZVtXT7E'])assert.equal(h.youtubeVideoId(url),null);
});
