import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AI_CONFIG} from '../dist/ai/config/ai.config.js';
import {searchWeb} from '../dist/ai/services/serper.service.js';

test('a provider phase budget cancels Serper without changing the wire payload',async context=>{
 const previous=AI_CONFIG.serperApiKey;AI_CONFIG.serperApiKey='test-key';context.after(()=>{AI_CONFIG.serperApiKey=previous;});
 const controller=new AbortController();let observed;
 context.mock.method(globalThis,'fetch',async(_url,options)=>{
  observed=options.signal;assert.deepEqual(JSON.parse(options.body),{q:'film',num:4});
  return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
 });
 const work=searchWeb('film',{num:4},controller.signal);controller.abort();
 await assert.rejects(work);assert.equal(observed.aborted,true);
});
test('an already cancelled provider phase never starts a Serper request',context=>{
 let called=false;context.mock.method(globalThis,'fetch',async()=>{called=true;throw Error('must not run');});
 const controller=new AbortController();controller.abort();
 assert.throws(()=>searchWeb('film',{},controller.signal));assert.equal(called,false);
});
