import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVideoImportRecognition } from '../dist/ai/video-import/services/video-import-recognition.service.js';
import { chatCheckpoint, checkpointKey, operationSignal } from '../dist/ai/utils/chat-operation.js';
import { VideoRecognitionModel } from '../dist/ai/video-import/models/video-recognition.model.js';
import { createVideoImportCatalogDispatcher } from '../dist/ai/video-import/services/video-import-catalog.service.js';

function harness() {
 const row={id:'a'.repeat(64),platform:'instagram',canonicalUrl:'https://www.instagram.com/reel/fixture/',videoId:'fixture',status:'completed',r2Key:`videoimport/${'a'.repeat(64)}/${'b'.repeat(64)}.mp4`,metadata:{durationSeconds:67,sizeBytes:1000,width:720,height:720,mimeType:'video/mp4',hasAudio:true}};
 const owner={kind:'user',id:'owner'},events=[];let saved=null,locked=false,token=null;let checkpoints={};
 const answer={text:'Kino topildi',model:'existing-video-model',movie:{title:'Fixture',titleUz:null,titleRu:null,year:2025,confidence:'high',sources:[{title:'Evidence',url:'https://example.org/movie'}],posters:[],uzbekLinks:[{url:'https://example.org/watch',title:'Fixture'}]}};
 const deps={
  imports:{get:async account=>{events.push('owner');return account.id===owner.id?row:null;}},
  storage:{inspect:async()=>{events.push('head');return{sizeBytes:1000};},signForAnalysis:async()=>{events.push('sign');return'https://private-r2.example/video?temporary=secret';}},
  results:{alive:async()=>true,get:async()=>saved,claim:async(_id,fingerprint,nextToken)=>{
   if(locked)return null;locked=true;token=nextToken;saved??={fingerprint,result:null};return structuredClone(checkpoints);
  },checkpoint:async(_id,lease,key,value)=>{assert.equal(lease,token);checkpoints[key]=value;return true;},
  complete:async(_id,lease,result)=>{assert.equal(lease,token);events.push('complete');saved.result=structuredClone(result);return true;},
  release:async()=>{events.push('release');locked=false;}},
  findMovie:async(_text,media,_delta,progress)=>{
   events.push('find');assert.equal(media.length,1);assert.equal(media[0].mimeType,'video/mp4');assert.equal(media[0].durationSeconds,67);assert.match(media[0].fileUri,/temporary=secret/);
   progress?.('analyzing_video');return structuredClone(answer);
  },notifyCatalog:()=>events.push('notify'),
 };
 return {row,owner,events,deps,answer,run:options=>createVideoImportRecognition(deps)(owner,row.id,options),get saved(){return saved;},get checkpoints(){return checkpoints;}};
}
test('uses the current video service with a short-lived R2 link and durably saves the public result before catalog notification',async()=>{
 const h=harness(),stages=[];assert.deepEqual(await h.run({onProgress:stage=>stages.push(stage)}),h.answer);
 assert.deepEqual(h.events,['owner','head','sign','find','complete','notify','release']);
 assert.deepEqual(stages,['checking_video','analyzing_video']);
 assert.equal(JSON.stringify(h.saved).includes('temporary=secret'),false);
 assert.equal((await h.run()).movie.title,'Fixture');assert.equal(h.events.filter(event=>event==='find').length,1);
});
test('foreign owners, incomplete imports and changed text cannot start recognition',async()=>{
 const h=harness();
 await assert.rejects(()=>createVideoImportRecognition(h.deps)({kind:'user',id:'other'},h.row.id),{code:'IMPORT_NOT_READY'});
 h.row.status='processing';await assert.rejects(()=>h.run(),{code:'IMPORT_NOT_READY'});assert.equal(h.events.includes('sign'),false);
 h.row.status='completed';await h.run();await assert.rejects(()=>h.run({text:'Changed prompt'}),{code:'ANALYSIS_CONFLICT'});
});
test('native YouTube recognition uses the same result/outbox flow without R2 and caches its completed result', async () => {
 const h=harness();
 Object.assign(h.row,{platform:'youtube',transport:'youtube',canonicalUrl:'https://www.youtube.com/watch?v=pt4zDSv4ZoY',videoId:'pt4zDSv4ZoY',
  r2Key:null,analysisSeconds:180,metadata:{durationSeconds:null,sizeBytes:null,mimeType:null,width:null,height:null,hasAudio:null}});
 h.deps.findMovie=async(_text,media)=>{
  h.events.push('youtube');assert.equal(media[0].fileUri,h.row.canonicalUrl);assert.equal(media[0].analysisSeconds,180);
  assert.equal(media[0].durationSeconds,undefined);return h.answer;
 };
 assert.deepEqual(await h.run(),h.answer);assert.deepEqual(await h.run(),h.answer);
 assert.equal(h.events.filter(e=>e==='youtube').length,1);
 assert.equal(h.events.includes('head'),false);assert.equal(h.events.includes('sign'),false);
 assert.ok(h.events.includes('complete'));assert.ok(h.events.includes('notify'));
});
test('native YouTube resumes completed checkpoints after interruption without downloading media', async () => {
 const h=harness();let attempts=0,clues=0;
 Object.assign(h.row,{platform:'youtube',transport:'youtube',canonicalUrl:'https://www.youtube.com/watch?v=pt4zDSv4ZoY',videoId:'pt4zDSv4ZoY',r2Key:null,analysisSeconds:180,
  metadata:{durationSeconds:null,sizeBytes:null,mimeType:null,width:null,height:null,hasAudio:null}});
 h.deps.findMovie=async()=>{
  await chatCheckpoint(checkpointKey('youtube-test','clues'),async()=>{clues++;return{observations:['scene']};});
  if(++attempts===1)throw Error('interrupted');return h.answer;
 };
 await assert.rejects(()=>h.run(),/interrupted/);assert.equal(h.saved.result,null);
 assert.deepEqual(await h.run(),h.answer);assert.equal(clues,1);assert.equal(attempts,2);
 assert.equal(h.events.includes('head'),false);assert.equal(h.events.includes('sign'),false);
});
test('a missing or changed R2 object never reaches Gemini',async()=>{
 const h=harness();h.deps.storage.inspect=async()=>null;
 await assert.rejects(()=>h.run(),{code:'IMPORT_NOT_READY'});assert.equal(h.events.includes('find'),false);assert.ok(h.events.includes('release'));
 h.deps.storage.inspect=async()=>({sizeBytes:2000});await assert.rejects(()=>h.run(),{code:'IMPORT_NOT_READY'});
});
test('completed checkpoints resume after provider failure while signed URLs are renewed',async()=>{
 const h=harness();let attempts=0,clues=0;
 h.deps.findMovie=async()=>{
  await chatCheckpoint(checkpointKey('fixture','clues'),async()=>{clues++;return{title:'Fixture'};});
  if(++attempts===1)throw Object.assign(Error('provider unavailable'),{status:503});return h.answer;
 };
 await assert.rejects(()=>h.run());assert.equal(h.saved.result,null);
 assert.deepEqual(await h.run(),h.answer);assert.equal(clues,1);assert.equal(h.events.filter(event=>event==='sign').length,2);
 assert.equal(JSON.stringify(h.checkpoints).includes('temporary'),false);
});
test('simultaneous recognition is refused; stop reaches the existing operation context without completing a result',async()=>{
 const h=harness(),controller=new AbortController();let entered;
 const ready=new Promise(resolve=>{entered=resolve;});
 h.deps.findMovie=async()=>{const signal=operationSignal(10000);entered();await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));};
 const pending=h.run({signal:controller.signal});await ready;
 await assert.rejects(()=>h.run(),{code:'ANALYSIS_BUSY'});
 controller.abort(Error('user stopped'));await assert.rejects(pending,/user stopped/);
 assert.equal(h.saved.result,null);assert.equal(h.events.includes('complete'),false);
});
test('catalog notification and lease-release failure cannot erase a committed answer',async()=>{
 const h=harness();h.deps.notifyCatalog=()=>{throw Error('notify failed');};h.deps.results.release=async()=>{throw Error('database unavailable');};
 assert.deepEqual(await h.run(),h.answer);assert.deepEqual(h.saved.result,h.answer);
});
test('recognition collection stores result/checkpoints and an atomic catalog outbox without media byte fields',async()=>{
 const doc=new VideoRecognitionModel({_id:'a'.repeat(64),fingerprint:'b'.repeat(64)});
 await doc.validate();assert.equal(doc.catalogDispatch,'none');assert.deepEqual(doc.checkpoints,{});
 for(const field of ['fileUri','videoBytes','buffer','r2Url'])assert.equal(VideoRecognitionModel.schema.path(field),undefined);
});
test('a pause or deletion recorded by another instance aborts recognition before result completion',async()=>{
 const h=harness();h.deps.results.alive=async()=>false;
 h.deps.findMovie=async()=>{const signal=operationSignal(10000);return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('provider wrapper replaced abort')),{once:true}));};
 const keepAlive=setInterval(()=>{},1000);
 try{await assert.rejects(()=>h.run(),{code:'ANALYSIS_LEASE_LOST'});assert.equal(h.saved.result,null);assert.ok(h.events.includes('release'));}
 finally{clearInterval(keepAlive);}
});
test('import catalog outbox survives enqueue failure and forwards existing catalog input including Uzbek links',async()=>{
 const h=harness();let pending=true,fail=true;const inserted=new Map();
 const query={sort(){return this;},limit(){return this;},async lean(){return pending?[{_id:h.row.id,result:h.answer}]:[];}};
 const dispatcher=createVideoImportCatalogDispatcher({results:{find:()=>query,updateOne:async()=>{pending=false;}},jobs:{updateOne:async(filter,update)=>{
  if(fail)throw Error('database unavailable');if(!inserted.has(filter._id))inserted.set(filter._id,update.$setOnInsert.input);
 }}});
 await assert.rejects(()=>dispatcher.dispatch());assert.equal(pending,true);
 fail=false;assert.equal(await dispatcher.dispatch(),1);assert.equal(pending,false);assert.equal(await dispatcher.dispatch(),0);
 assert.equal(inserted.size,1);const input=[...inserted.values()][0];
 assert.equal(input.movie.title,'Fixture');assert.deepEqual(input.movie.uzbekLinks,h.answer.movie.uzbekLinks);
 assert.equal(JSON.stringify(input).includes('temporary=secret'),false);
});
