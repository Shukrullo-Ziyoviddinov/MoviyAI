import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchSearchNames,internalSearchNames,providerSearchUrl} from '../dist/ai/watch-search/search-plan.js';
import {readWatchPage,searchProviderVideos} from '../dist/ai/watch-search/provider-pages.js';
import {createPriorityWatchSearch} from '../dist/ai/services/priority-watch-search.service.js';
import {watchProvider} from '../dist/utils/watch-provider.js';
const film={title:'Drive',titleUz:'Ishtiyoq drayv poyga premyera',titleRu:'Драйв',year:2011};
const target='https://ok.ru/video/4484911467169';
const html=value=>new Response(value,{headers:{'content-type':'text/html'}});
function harness(overrides={}){
 const calls=[],logs=[];
 const defaults={searchWeb:async query=>{calls.push(['google',query]);return {organic:[]};},
  readPage:async()=>({title:'Ishtiyoq 2011 Uzbek',description:'Full movie',duration:6041,text:''}),
  searchProvider:async(site,name)=>{calls.push(['internal',site,name]);return {status:'ok',candidates:site==='ok.ru'?[{title:'Ishtiyoq',url:target,site,snippet:'Uzbek full film'}]:[]};},
  verify:async(_film,candidates)=>candidates,log:event=>logs.push(event)};
 return {lookup:createPriorityWatchSearch({...defaults,...overrides}),calls,logs};
}
test('search names remove marketing suffixes and keep shortened names as hypotheses only',()=>{
 assert.deepEqual(watchSearchNames(film),['Ishtiyoq drayv poyga','Drive','Драйв']);
 assert.deepEqual(internalSearchNames(film),['Ishtiyoq','Drive']);assert.equal(film.titleUz,'Ishtiyoq drayv poyga premyera');
 for(const site of ['vkvideo.ru','ok.ru','mover.uz'])assert.equal(new URL(providerSearchUrl(site,'A&B / test',2011)).hostname,site);
});
test('internal OK search finds a relative target link, removes tracking and ignores blank duplicate thumbnails',async()=>{
 let called;const result=await searchProviderVideos('ok.ru','Ishtiyoq',2011,new AbortController().signal,async(url,options)=>{called=url;assert.equal(options.redirect,'manual');return html('<a href="/video/4484911467169?st._aid=search"><img></a><a href="/video/4484911467169?st._aid=search">ishtiyoq 2011 mob (uzmedia.tv)</a><a href="https://evil.test/video/123">Ishtiyoq</a>');});
 assert.equal(called,'https://ok.ru/video/search/Ishtiyoq+2011');assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].url,target);
});
test('internal pages never follow login redirects and report blocked status',async()=>{
 let calls=0;const result=await searchProviderVideos('vkvideo.ru','Drive',2011,new AbortController().signal,async()=>{calls++;return new Response('',{status:302,headers:{location:'https://login.vk.ru/'}});});
 assert.equal(calls,1);assert.equal(result.status,'blocked');assert.deepEqual(result.candidates,[]);
});
test('Mover search keeps only relevant canonical video links',async()=>{
 const result=await searchProviderVideos('mover.uz','Drive',2011,new AbortController().signal,async()=>html('<a href="/watch/Ab12/">Drive 2011 Uzbek</a><a href="/watch/Xx45/">Random unrelated</a><a href="/search?val=Drive">Drive</a>'));
 assert.deepEqual(result.candidates.map(row=>row.url),['https://mover.uz/watch/Ab12/']);
});
test('video metadata includes actual duration and title, with bounded HTML reads',async()=>{
 const page=await readWatchPage(target,new AbortController().signal,async()=>html('<meta property="og:title" content="Ishtiyoq 2011"><meta property="og:video:duration" content="6041"><meta name="description" content="Uzbek film">'));
 assert.equal(page.duration,6041);assert.equal(page.title,'Ishtiyoq 2011');assert.equal(page.description,'Uzbek film');
 let called=false;assert.equal(await readWatchPage('https://evil.test/video/123',new AbortController().signal,async()=>{called=true;return html('');}),null);assert.equal(called,false);
});
test('mobile OK Google results become the same canonical source',()=>{
 assert.equal(watchProvider('https://m.ok.ru/video/4484911467169?from=search').url,target);
 assert.equal(watchProvider('https://m.ok.ru.evil.test/video/4484911467169'),null);
});
test('empty Google results fall back to internal searches in provider order',async()=>{
 const h=harness();const links=await h.lookup(film);
 assert.deepEqual(links.map(row=>row.url),[target]);
 const internal=h.calls.filter(row=>row[0]==='internal');assert.deepEqual([...new Set(internal.map(row=>row[1]))],['vkvideo.ru','ok.ru','mover.uz']);
 assert.equal(internal.find(row=>row[1]==='ok.ru')[2],'Ishtiyoq');assert.ok(h.logs.some(event=>event.event==='internal-search'&&event.site==='ok.ru'));
});
test('wrong Google candidate rejected by verification still allows internal fallback',async()=>{
 const h=harness({searchWeb:async()=>({organic:[{title:'Another film',link:'https://ok.ru/video/999',position:1}]}),verify:async(_film,candidates)=>candidates.filter(row=>row.url===target)});
 assert.deepEqual((await h.lookup(film)).map(row=>row.url),[target]);
});
test('blocked VK never blocks OK or leaks invented verifier URLs',async()=>{
 const h=harness({searchProvider:async site=>({status:site==='vkvideo.ru'?'blocked':'ok',candidates:site==='ok.ru'?[{url:target,title:'Ishtiyoq',site,snippet:''}]:[]}),verify:async(_film,candidates)=>[...candidates,{url:'https://ok.ru/video/999',title:'Invented',site:'ok.ru',snippet:''}]});
 const links=await h.lookup(film);assert.deepEqual(links.map(row=>row.url),[target]);assert.ok(h.logs.some(event=>event.status==='blocked'));
});
