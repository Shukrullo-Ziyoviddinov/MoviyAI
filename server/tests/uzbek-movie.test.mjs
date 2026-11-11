import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {readUzbekPage,uzbekDetailUrl,discoverUzbekDetails,isUzbekMovieRequest,uzbekLookupReply} from '../dist/ai/services/uzbek-movie.service.js';

const valid='https://uzmovi.net/tarjima-kinolar/123-interstellar.html';
test('Uzbek detail URL boundary excludes other hosts, lists, files and credentials',()=>{
 assert.equal(uzbekDetailUrl(valid),valid);
 for(const url of ['https://uzmovi.net/','https://evil.uzmovi.net/movie','https://uzmovi.net.evil.org/movie','https://user:pass@uzmovi.net/movie','https://uzmovi.net:8443/movie','http://uzmovi.net/movie','https://uzmovi.net/search?q=film','https://uzmovi.net/category/movie','https://uzmovi.net/uploads/a.mp4'])assert.equal(uzbekDetailUrl(url),null,url);
});
test('page reader never follows redirects outside the four sites',async()=>{
 let calls=0;const page=await readUzbekPage(valid,async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://169.254.169.254/private'}});});
 assert.equal(page,null);assert.equal(calls,1);
});
test('reader requires movie heading with Uzbek language and rejects oversize and non HTML',async()=>{
 const fetchHtml=html=>async()=>new Response(html,{headers:{'content-type':'text/html'}});
 assert.equal(await readUzbekPage(valid,fetchHtml('<h1>Interstellar 2014</h1><footer>Uzbek movies</footer>')),null);
 const page=await readUzbekPage(valid,fetchHtml('<h1>Interstellar Uzbek tilida</h1><script>dangerous()</script><p>Yili: 2014. Christopher Nolan.</p>'));
 assert.match(page.text,/2014/);assert.doesNotMatch(page.text,/dangerous/);
 assert.equal(await readUzbekPage(valid,fetchHtml('x'.repeat(300001))),null);
 assert.equal(await readUzbekPage(valid,async()=>new Response('binary',{headers:{'content-type':'image/jpeg'}})),null);
 assert.ok(await readUzbekPage(valid,fetchHtml('<title>Interstellar Uzbek tilida</title><h1>Interstellar</h1><p>2014</p>')));
 const encoded=await readUzbekPage(valid,fetchHtml('<h1>Interstellar O&#039;zbek tilida</h1><!-- unrelated instructions --><p>2014</p>'));
 assert.ok(encoded);assert.match(encoded.title,/O'zbek/);assert.doesNotMatch(encoded.text,/unrelated instructions/);
});
test('indexed collection links lead to detail pages, never become watch recommendations themselves',async()=>{
 const collection='https://asilmedia.org/xfsearch/year/2011/';assert.equal(uzbekDetailUrl(collection),null);
 const detail='https://asilmedia.org/9067-garri-potter-8-ajal-tuhfasi-2.html';
 const fetcher=async()=>new Response(`<a href="${detail}">Garri Potter: Ajal tuhfasi 2 2011</a><a href="https://evil.example/garri-potter.html">Garri Potter</a><a href="/xfsearch/actors/garri-potter/">Garri Potter</a>`,{headers:{'content-type':'text/html'}});
 assert.deepEqual(await discoverUzbekDetails(collection,'Garri Potter Ajal tuhfasi 2 2011',fetcher),[detail]);
});
test('Uzbek dub follow-ups request a real lookup; general social replies do not',()=>{
 for(const text of ['uzbekcha dublaji ham top',"o'zbek tilidagini qidir",'uzb link ber','find Uzbek dubbed version','havolasini ber'])assert.equal(isUzbekMovieRequest(text),true,text);
 for(const text of ['salom',"o'zbek aktyorlari haqida gapir",'Interstellar haqida gapir'])assert.equal(isUzbekMovieRequest(text),false,text);
 assert.match(uzbekLookupReply('uzbekcha dublaji ham top',false),/qayta tekshirdim/);
});
const source=readFileSync(new URL('../dist/ai/services/uzbek-movie.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
function harness({badYear=false,wrongFilm=false,unavailable=false,imageError=false,transientError=false,recoverAlias=false}={}){
 const calls=[];const searchQueries=[];let queries=0;
 class GoogleGenAI{models={generateContent:async request=>{if(request.config.maxOutputTokens===300)return {text:JSON.stringify({queries:[recoverAlias?'SupportedLocalName 2014':'Interstellar 2014 uzbek']})};calls.push(request);if(transientError&&calls.length===1)throw Error('Temporary provider failure');if(imageError&&request.contents[0].parts.some(part=>part.fileData))throw Error('Poster inaccessible');return {text:JSON.stringify({matches:[{index:0,title:'Interstellar',sameFilm:!wrongFilm,yearConfirmed:!badYear,identityEvidence:'Interstellar, 2014, Christopher Nolan'},{index:99,title:'Invented',sameFilm:true,yearConfirmed:true,identityEvidence:'Invented evidence string'}]})};}};}
 const searchWeb=async query=>{queries++;searchQueries.push(query);if(recoverAlias&&!query.includes('SupportedLocalName'))return {organic:[]};return {organic:[{title:'Movie',link:query.includes('site:uzmovi.net')?valid:'https://untrusted.example/film'}]};};
 const readPage=async url=>unavailable?null:{url,title:'Interstellar Uzbek tilida',text:'Interstellar, 2014, Christopher Nolan',posterUrl:'https://uzmovi.net/uploads/poster.jpg'};
 const api=new Function('GoogleGenAI','z','AI_CONFIG','searchWeb',source+'\nreturn createUzbekMovieSearch;')(GoogleGenAI,z,{apiKey:'fake',models:{image:'image-model'}},searchWeb)({searchWeb,readPage});
 return {api,calls,searchQueries,queries:()=>queries};
}
const film={title:'Interstellar',titleUz:null,titleRu:null,year:2014};
test('known local movie title and year are searched without invented aliases',async()=>{
 const h=harness();await h.api({...film,titleUz:'Mahalliy nom 2'});
 assert.ok(h.searchQueries.some(query=>query.includes('Mahalliy nom 2 2014 uzbek tilida')));
 assert.equal(h.queries(),8);
});
test('temporary verification failure gets one text-only retry',async()=>{
 const h=harness({transientError:true});assert.equal((await h.api(film)).length,1);assert.equal(h.calls.length,2);
});
test('failed local lookup expands to other sources then rechecks selected sites',async()=>{
 const h=harness({recoverAlias:true});const result=await h.api({...film,titleUz:'UnhelpfulAlias'});
 assert.equal(result.length,1);
 assert.ok(h.searchQueries.some(query=>!query.startsWith('site:')));
 assert.ok(h.searchQueries.some(query=>query.startsWith('site:')&&query.includes('SupportedLocalName')));
 assert.ok(h.queries()<=17);
});
test('only verified indexed exact film links are returned; failure stays optional',async()=>{
 const h=harness();assert.deepEqual(await h.api(film),[{title:'Interstellar',url:valid,site:'uzmovi.net'}]);assert.ok(h.queries()<=8);
 for(const options of [{badYear:true},{wrongFilm:true},{unavailable:true}])assert.deepEqual(await harness(options).api(film),[]);
});
test('frames and site posters go directly to Gemini; inaccessible media falls back to page facts',async()=>{
 const frame={fileData:{fileUri:'https://r2.example/frame.jpg',mimeType:'image/jpeg'}};
 const h=harness({imageError:true});assert.equal((await h.api(film,[frame])).length,1);assert.equal(h.calls.length,2);
 assert.ok(h.calls[0].contents[0].parts.some(part=>part.fileData?.fileUri==='https://uzmovi.net/uploads/poster.jpg'));
 assert.ok(h.calls[0].contents[0].parts.some(part=>part.fileData?.fileUri===frame.fileData.fileUri));
 assert.ok(h.calls[1].contents[0].parts.every(part=>!part.fileData));
});
