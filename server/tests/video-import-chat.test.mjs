import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVideoImportChat, chatVideoUrl } from '../dist/ai/video-import/services/video-import-chat.service.js';
import { ChatFailure } from '../dist/ai/types/chat-progress.types.js';
const link='https://www.instagram.com/reel/fixture/';
function harness(){
 const row={id:'a'.repeat(64),status:'completed',stage:'ready'},events=[];
 const result={text:'Found',model:'existing',movie:{title:'Fixture'}};
 const deps={imports:{enqueue:async(owner,input)=>{events.push(['enqueue',owner,input]);return{...row};},get:async()=>({...row}),
  cancel:async()=>{events.push(['cancel']);return true;},resume:async()=>{events.push(['resume']);row.status='retry';return true;}},
  pipeline:{runOnce:async()=>{events.push(['run']);},recognize:async(owner,id,options)=>{events.push(['recognize',owner,id]);options.onProgress?.('analyzing_video');return result;}},
  delay:async()=>{row.status='completed';},};
 return {row,events,deps,result,call:(text=link,options={})=>createVideoImportChat(deps)({kind:'user',id:'owner'},'conversation','request',text,options)};
}
test('ordinary text and ordinary source URLs retain normal routing, while all supported video platforms are recognized',async()=>{
 const h=harness();assert.equal(await h.call('Salom'),null);assert.equal(await h.call('https://example.org/movie'),null);assert.equal(h.events.length,0);
 for(const url of [link,'https://youtu.be/abcdefghijk','https://www.tiktok.com/@example/video/123456789012'])assert.ok(chatVideoUrl(url));
 await assert.rejects(()=>h.call('https://youtube.com.evil.test/watch?v=abcdefghijk'),e=>e.failureCode==='video_unreadable');
});
test('URL import uses trusted ownership/request identity and returns only the existing movie result',async()=>{
 const h=harness();let internalId;const stages=[];
 assert.deepEqual(await h.call(link,{onImport:async id=>{internalId=id;},onProgress:stage=>stages.push(stage)}),h.result);
 assert.equal(internalId,h.row.id);assert.deepEqual(h.events[0][1],{kind:'user',id:'owner'});
 assert.equal(h.events[0][2].conversationId,'conversation');assert.equal(h.events[0][2].requestId,'request');
 assert.equal(h.result.videos,undefined);assert.ok(stages.includes('analyzing_video'));
});
test('waits for real queue stages and waits for recognition capacity rather than repeating downloads',async()=>{
 const h=harness();h.row.status='processing';h.row.stage='downloading';let recognition=0;
 h.deps.pipeline.recognize=async()=>{if(++recognition===1)throw Object.assign(Error(),{code:'ANALYSIS_BUSY'});return h.result;};
 const stages=[];assert.deepEqual(await h.call(link,{onProgress:stage=>stages.push(stage)}),h.result);
 assert.equal(recognition,2);assert.equal(h.events.filter(e=>e[0]==='enqueue').length,1);assert.ok(stages.includes('downloading_video'));
 assert.ok(stages.includes('waiting_analysis'));
});
test('multiple URLs and simultaneous URL/file attachments are rejected before enqueue',async()=>{
 const h=harness();await assert.rejects(()=>h.call(link+' https://youtu.be/abcdefghijk'),e=>e.failureCode==='video_unreadable');
 await assert.rejects(()=>h.call(link,{hasMedia:true}),e=>e.failureCode==='video_unreadable');assert.equal(h.events.length,0);
});
test('stop during the queue wait cancels the owned import, and explicit retry resumes a cancelled import',async()=>{
 const h=harness(),controller=new AbortController();h.row.status='processing';
 h.deps.delay=async()=>{controller.abort(new ChatFailure('stopped'));controller.signal.throwIfAborted();};
 await assert.rejects(()=>h.call(link,{signal:controller.signal}),e=>e.failureCode==='stopped');assert.ok(h.events.some(e=>e[0]==='cancel'));
 h.row.status='cancelled';h.deps.delay=async()=>{h.row.status='completed';};
 assert.deepEqual(await h.call(),h.result);assert.ok(h.events.some(e=>e[0]==='resume'));
});
test('a stopped chat checkpoint cancels an import even before the queue worker starts',async()=>{
 const h=harness();await assert.rejects(()=>h.call(link,{onImport:async()=>{throw new ChatFailure('stopped');}}),e=>e.failureCode==='stopped');
 assert.ok(h.events.some(e=>e[0]==='cancel'));assert.equal(h.events.some(e=>e[0]==='run'),false);
});

test('storage/tool failures are not misreported as an AI provider outage',async()=>{
 for(const [code,failure] of [['R2_UNAVAILABLE','unknown'],['TOOL_MISSING','unknown'],['VIDEO_TOO_LARGE','video_unreadable'],['PROCESS_TIMEOUT','timeout'],['PREPARATION_TIMEOUT','video_prepare_timeout']]){
  const h=harness();h.row.status='failed';h.row.errorCode=code;h.deps.imports.resume=async()=>false;
  await assert.rejects(()=>h.call(),error=>error.failureCode===failure);
 }
});
