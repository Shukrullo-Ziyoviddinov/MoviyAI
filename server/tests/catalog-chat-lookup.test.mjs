import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogNameKeys} from '../dist/ai/catalog/utils/catalog-identity.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
import {youtubeVideoId} from '../dist/ai/services/movie-trailer.service.js';
const source=readFileSync(new URL('../dist/ai/services/catalog-chat-lookup.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
const row={id:8001,title:{uz:'Interstellar',ru:'Interstellar RU'},homeImgPoster:'/img/poster.jpg',catalogPosters:['/img/poster2.jpg'],ratingImdb:8.7,ratingKinopoisk:8.5,genre:{uz:['Fantastika'],ru:['Fantasy']},description:{uz:{text:'Stored plot',director:'Nolan'},ru:{text:'RU plot',director:'Nolan RU'}},specs:{year:2014,duration:169,ageRating:'12+',countries:['USA']},actorIds:[9001],trailers:'https://www.youtube.com/watch?v=zSWdZVtXT7E',watchUrl:'https://asilmedia.org/123-film.html'};
function harness(rows=[row]){
 const query=value=>({select(){return this},limit(){return this},lean:async()=>structuredClone(value)});
 const Movie={find:()=>query(rows)},Actor={find:()=>query([{id:9001,actorName:'Matthew',actorImg:'/img/actor.jpg'}])};
 return new Function('Movie','Actor','env','catalogNameKeys','emptyDossier','youtubeVideoId',source+'\nreturn findCatalogChatCandidates;')(Movie,Actor,{publicUrl:'https://api.example'},catalogNameKeys,emptyDossier,youtubeVideoId);
}
test('database response maps catalogue facts, R2 media paths and actor IDs without web research',async()=>{
 const [movie]=await harness()(['Interstellar'],2014,'uz');
 assert.equal(movie.catalogId,8001);assert.equal(movie.details.synopsis.value,'Stored plot');assert.equal(movie.details.runtimeMinutes.value,169);
 assert.equal(movie.posters.length,2);assert.equal(movie.posters[0].url,'https://api.example/api/media/movieimg/poster.jpg');
 assert.equal(movie.catalogPortraits[0].imageUrl,'https://api.example/api/media/actorimg/actor.jpg');assert.equal(movie.details.cast[0].name,'Matthew');
 assert.equal(movie.trailer.videoId,'zSWdZVtXT7E');assert.equal(movie.uzbekLinks[0].url,row.watchUrl);
});
test('wrong years, different sequels and truncated candidate pages never become a database hit',async()=>{
 assert.deepEqual(await harness()(['Interstellar'],2020,'uz'),[]);
 assert.deepEqual(await harness()(['Interstellar 2'],2014,'uz'),[]);
 assert.deepEqual(await harness(Array(101).fill(row))(['Interstellar'],2014,'uz'),[]);
});
test('an unrelated host with a YouTube-looking query cannot become a stored trailer',async()=>{
 const [movie]=await harness([{...row,trailers:'https://example.com/watch?v=zSWdZVtXT7E'}])(['Interstellar'],2014,'uz');
 assert.equal(movie.trailer,null);
});
