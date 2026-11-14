import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {readUzbekPage,uzbekDetailUrl,discoverUzbekDetails,searchUzbekSite,isUzbekMovieRequest,uzbekLookupReply,isSeriesIdentity} from '../dist/ai/services/uzbek-movie.service.js';

const valid='https://uzmovi.net/tarjima-kinolar/123-interstellar.html';
test('series identity is explicit or supported by original source metadata, never a guessed title',()=>{
 assert.equal(isSeriesIdentity({title:'Cukur',mediaType:'series'}),true);
 assert.equal(isSeriesIdentity({title:'Cukur',sources:[{title:'Cukur (TV Series 2017-2021)',url:'https://www.imdb.com/title/tt6726662/'}]}),true);
 assert.equal(isSeriesIdentity({title:'Cukur'}),false);assert.equal(isSeriesIdentity({title:'Cukur',mediaType:'movie',sources:[{title:'A TV series',url:'https://example.com'}]}),false);
});
test('a normal series page with a long episode list fits the bounded reader',async()=>{
 const html='<h1>Chuqur turk serial Uzbek tilida</h1><p>2017, Aras Bulut Iynemli</p>'+'<div>Episode</div>'.repeat(20000);
 assert.ok(Buffer.byteLength(html)>300000);const page=await readUzbekPage(valid,async()=>new Response(html,{headers:{'content-type':'text/html'}}));assert.ok(page);assert.match(page.title,/Chuqur/);assert.ok(page.text.length<=18000);
});
test('long episode lists do not discard film facts already present in the bounded HTML prefix',async()=>{
 const html='<h1>Chuqur turk serial Uzbek tilida</h1><p>Yili 2017. Aras Bulut Iynemli.</p>'+'<div>Episode</div>'.repeat(100000);
 const page=await readUzbekPage(valid,async()=>new Response(html,{headers:{'content-type':'text/html'}}));assert.ok(page);assert.match(page.text,/2017/);assert.ok(page.text.length<=18000);
});
test('Uzbek detail URL boundary excludes other hosts, lists, files and credentials',()=>{
 assert.equal(uzbekDetailUrl(valid),valid);
 for(const url of ['https://uzmovi.net/','https://evil.uzmovi.net/movie','https://uzmovi.net.evil.org/movie','https://user:pass@uzmovi.net/movie','https://uzmovi.net:8443/movie','http://uzmovi.net/movie','https://uzmovi.net/search?q=film','https://uzmovi.net/category/movie','https://uzmovi.net/uploads/a.mp4'])assert.equal(uzbekDetailUrl(url),null,url);
});
test('page reader never follows redirects outside the allowed sites',async()=>{
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
function harness({badYear=false,wrongFilm=false,unavailable=false,imageError=false,transientError=false,recoverAlias=false,yearlessOnly=false,internalOnly=false}={}){
 const calls=[];const searchQueries=[];let queries=0;
 class GoogleGenAI{models={generateContent:async request=>{if(request.config.maxOutputTokens===300)return {text:JSON.stringify({queries:[recoverAlias?'SupportedLocalName 2014':'Interstellar 2014 uzbek']})};calls.push(request);if(transientError&&calls.length===1)throw Error('Temporary provider failure');if(imageError&&request.contents[0].parts.some(part=>part.fileData))throw Error('Poster inaccessible');return {text:JSON.stringify({matches:[{index:0,title:'Interstellar',sameFilm:!wrongFilm,yearConfirmed:!badYear,identityEvidence:'Interstellar, 2014, Christopher Nolan'},{index:99,title:'Invented',sameFilm:true,yearConfirmed:true,identityEvidence:'Invented evidence string'}]})};}};}
 const searchWeb=async query=>{queries++;searchQueries.push(query);if(internalOnly||yearlessOnly&&query.includes('2014')||recoverAlias&&!query.includes('SupportedLocalName'))return {organic:[]};return {organic:[{title:'Movie',link:query.includes('site:uzmovi.net')?valid:'https://untrusted.example/film'}]};};
 const readPage=async url=>unavailable?null:{url,title:'Interstellar Uzbek tilida',text:'Interstellar, 2014, Christopher Nolan',posterUrl:'https://uzmovi.net/uploads/poster.jpg'};
 const api=new Function('GoogleGenAI','z','AI_CONFIG','searchWeb',source+'\nreturn createUzbekMovieSearch;')(GoogleGenAI,z,{apiKey:'fake',models:{image:'image-model'}},searchWeb)({searchWeb,readPage,...(internalOnly?{searchSite:async site=>site==='uzmovi.net'?[valid]:[]}: {})});
 return {api,calls,searchQueries,queries:()=>queries};
}
const film={title:'Interstellar',titleUz:null,titleRu:null,year:2014};

test('missing indexed release year triggers a yearless search without dropping identity verification',async()=>{
 const h=harness({yearlessOnly:true});const links=await h.api(film);
 assert.equal(links.length,1);assert.ok(h.searchQueries.some(query=>query.startsWith('site:uzmovi.net')&&!query.includes('2014')));
 assert.ok(h.calls.length>0);
 assert.deepEqual(await harness({yearlessOnly:true,wrongFilm:true}).api(film),[]);
});

test('unindexed internal search candidates still require successful film verification',async()=>{
 const h=harness({internalOnly:true});assert.equal((await h.api(film)).length,1);
 assert.deepEqual(await harness({internalOnly:true,wrongFilm:true}).api(film),[]);
});

test('public internal searches use confirmed forms and return only same-site detail candidates',async()=>{
 for(const site of ['uzmovi.net','asilmedia.org']){
  let request;
  const url=`https://${site}/123-other-local-name.html`;
  const links=await searchUzbekSite(site,'Original Title 2019',async value=>{
   request=new URL(value);
   return new Response(`<a href="${url}">Boshqa mahalliy nom</a><a href="https://evil.example/123.html">Original Title</a><a href="/search?q=x">Search</a>`,{headers:{'content-type':'text/html'}});
  });
  assert.deepEqual(links,[url]);assert.equal(request.searchParams.get(site==='uzmovi.net'?'q':'story'),'Original Title');
  assert.equal(uzbekDetailUrl(request.href),null);
 }
 let fetched=false;assert.deepEqual(await searchUzbekSite('evil.example','Film',async()=>{fetched=true;}),[]);assert.equal(fetched,false);
});
test('series verification accepts a series landing page instead of applying movie-only exclusions',async()=>{
 const h=harness();await h.api({...film,mediaType:'series'});assert.match(h.calls[0].config.systemInstruction,/TV SERIES/);assert.match(h.calls[0].config.systemInstruction,/barcha qismlari/);assert.match(h.calls[0].config.systemInstruction,/episode release year/);
 const movie=harness();await movie.api({...film,mediaType:'movie'});assert.match(movie.calls[0].config.systemInstruction,/input is a MOVIE/);
});
test('known local movie title and year are searched without invented aliases',async()=>{
 const h=harness();await h.api({...film,titleUz:'Mahalliy nom 2'});
 assert.ok(h.searchQueries.some(query=>query.includes('Mahalliy nom 2 2014 uzbek tilida')));
 assert.ok(h.queries()<=14);
});
test('temporary verification failure gets one text-only retry',async()=>{
 const h=harness({transientError:true});assert.equal((await h.api(film)).length,1);assert.equal(h.calls.length,2);
});
test('failed local lookup expands to other sources then rechecks selected sites',async()=>{
 const h=harness({recoverAlias:true});const result=await h.api({...film,titleUz:'UnhelpfulAlias'});
 assert.equal(result.length,1);
 assert.ok(h.searchQueries.some(query=>!query.startsWith('site:')));
 assert.ok(h.searchQueries.some(query=>query.startsWith('site:')&&query.includes('SupportedLocalName')));
 assert.ok(h.queries()<=26);
});
test('only verified indexed exact film links are returned; failure stays optional',async()=>{
 const h=harness();assert.deepEqual(await h.api(film),[{title:'Interstellar',url:valid,site:'uzmovi.net'}]);assert.ok(h.queries()<=14);
 for(const options of [{badYear:true},{wrongFilm:true},{unavailable:true}])assert.deepEqual(await harness(options).api(film),[]);
});
test('frames and site posters go directly to Gemini; inaccessible media falls back to page facts',async()=>{
 const frame={fileData:{fileUri:'https://r2.example/frame.jpg',mimeType:'image/jpeg'}};
 const h=harness({imageError:true});assert.equal((await h.api(film,[frame])).length,1);assert.equal(h.calls.length,2);
 assert.ok(h.calls[0].contents[0].parts.some(part=>part.fileData?.fileUri==='https://uzmovi.net/uploads/poster.jpg'));
 assert.ok(h.calls[0].contents[0].parts.some(part=>part.fileData?.fileUri===frame.fileData.fileUri));
 assert.ok(h.calls[1].contents[0].parts.every(part=>!part.fileData));
});

test('Playuz details are accepted while searches, files and lookalike domains are rejected',async()=>{
 const url='https://playuz.net/serial/123-example-uzbek-tilida.html';
 assert.equal(uzbekDetailUrl(url),url);
 assert.equal(uzbekDetailUrl(url.replace('playuz.net','www.playuz.net')),url.replace('playuz.net','www.playuz.net'));
 for(const bad of ['https://playuz.net/','https://playuz.net/?do=search&story=film','https://playuz.net/uploads/poster.jpg','https://evil.playuz.net/123.html','https://playuz.net.evil.org/123.html'])assert.equal(uzbekDetailUrl(bad),null);
 const page=await readUzbekPage(url,async()=>new Response('<h1>Misol Uzbek tilida</h1><p>2019</p>',{headers:{'content-type':'text/html'}}));assert.ok(page);
 const h=harness();await h.api(film);assert.ok(h.searchQueries.some(query=>query.startsWith('site:playuz.net ')));
});
