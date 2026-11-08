import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/ai/services/character-image.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
function harness({fail=false}={}){
 const queries=[];
 const searchImages=async query=>{queries.push(query);if(fail)throw Error('search unavailable');if(query.startsWith('"'))return {images:[{title:query.split('"')[1]+' actor portrait',imageUrl:'https://example.com/actor.jpg',link:'https://example.com/actor'}]};const name=query.includes('Belle')?'Belle':'Beast';return {images:[
  {title:name+' 2017',imageUrl:'https://example.com/wrong.jpg'},
  {title:name+' 1991',imageUrl:'javascript:evil'},
  {title:name+' 1991',imageUrl:'https://example.com/original.jpg',thumbnailUrl:'https://example.com/thumb.jpg',link:'https://example.com/source'},
 ]};};
 const publicHttpsUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};
 const api=new Function('AI_CONFIG','searchImages','publicHttpsUrl',source+'\nreturn {mainCharacterLabels,findCharacterImages};')({serperApiKey:'test'},searchImages,publicHttpsUrl);
 return {...api,queries,calls:()=>0};
}
const answer='## Beauty and the Beast (1991)\n### Asosiy qahramonlar\n- **Bell (Belle):** Qahramon.\n- **Maxluq (Beast):** Shahzoda.\n### Musiqa\n- **Boshqa:** Tavsif.';
test('only named characters under the main-character section are extracted in supported languages',()=>{
 const h=harness();assert.deepEqual(h.mainCharacterLabels(answer),['Bell (Belle)','Maxluq (Beast)']);
 assert.deepEqual(h.mainCharacterLabels('**Главные герои:**\n* **Белль:** Героиня.\n**Музыка**\n* **Другой:** Текст.'),['Белль']);
});
test('image identification supplies character pictures and actor portraits without another user prompt',async()=>{
 const h=harness();const result=await h.findCharacterImages('No formatted headings required',{title:'Beauty and the Beast',year:1991,details:{characters:[{name:'Bell',originalName:'Belle'},{name:'Maxluq',originalName:'Beast'}],cast:[{name:"Paige O'Hara"}]}});
 assert.equal(result.length,3);assert.equal(result.filter(image=>image.kind==='actor').length,1);assert.equal(result.filter(image=>image.kind==='character').length,2);
 assert.equal(result.find(image=>image.kind==='actor').label,"Paige O'Hara");assert.ok(h.queries.some(query=>query.includes('actor portrait headshot')));
});
test('ordinary replies never trigger portrait searches',async()=>{
 const h=harness();assert.deepEqual(await h.findCharacterImages('Salom!',''),[]);assert.equal(h.queries.length,0);
});
test('searches bind original labels to the film version and prefer small thumbnails',async()=>{
 const h=harness();const result=await h.findCharacterImages(answer,'1991 animated film');
 assert.equal(result.length,2);assert.equal(result[1].label,'Maxluq (Beast)');assert.equal(result[0].imageUrl,'https://example.com/thumb.jpg');
 assert.equal(h.queries.length,2);assert.ok(h.queries.every(query=>query.includes('1991')));
});
test('ambiguous film version or search failure leaves text usable without pictures',async()=>{
 const h=harness();assert.deepEqual(await h.findCharacterImages(answer.replace('(1991)',''),''),[]);assert.equal(h.queries.length,0);
 assert.deepEqual(await harness({fail:true}).findCharacterImages(answer,''),[]);
});
