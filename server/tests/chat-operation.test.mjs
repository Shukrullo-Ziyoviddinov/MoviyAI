import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runChatOperation,chatCheckpoint,checkpointKey,operationSignal,isContinueRequest,withoutChatOperation} from '../dist/ai/utils/chat-operation.js';

test('resume reuses completed checkpoints and retries only unfinished work',async()=>{
 const saved={},first=new AbortController();let analysis=0,search=0;
 const work=()=>runChatOperation({signal:first.signal,checkpoints:{...saved},save:async(k,v)=>{saved[k]=v;}},async()=>{
  await chatCheckpoint('analysis',async()=>{analysis++;return {title:'Observed'};});
  await chatCheckpoint('search',async()=>{search++;first.abort();return ['late'];});
 });
 await assert.rejects(work);assert.equal(saved.search,undefined);
 await runChatOperation({signal:new AbortController().signal,checkpoints:{...saved},save:async(k,v)=>{saved[k]=v;}},async()=>{
  await chatCheckpoint('analysis',async()=>{analysis++;return {};});
  await chatCheckpoint('search',async()=>{search++;return ['verified'];});
 });
 assert.equal(analysis,1);assert.equal(search,2);
});

test('abort reaches provider signals and independent work has no request context',async()=>{
 const controller=new AbortController();
 await runChatOperation({signal:controller.signal,checkpoints:{},save:async()=>{}},async()=>{
  const signal=operationSignal(5000);controller.abort();assert.equal(signal.aborted,true);
  assert.equal(withoutChatOperation(()=>operationSignal(5000).aborted),false);
  await assert.rejects(()=>chatCheckpoint('late',async()=>1));
 });
});

test('continue phrases are bounded and checkpoint keys do not contain input secrets',()=>{
 for(const value of ['davom et','Davom ettir','continue','Продолжи'])assert.equal(isContinueRequest(value),true);
 for(const value of ['Interstellar haqida ayt','davom et va boshqa kino top'])assert.equal(isContinueRequest(value),false);
 assert.match(checkpointKey('search','secret'),/^[a-f0-9]{64}$/);
});
