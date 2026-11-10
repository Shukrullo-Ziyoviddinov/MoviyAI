import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogOperation,catalogFailureDetails} from '../dist/ai/catalog/utils/catalog-diagnostics.js';
import {createCatalogMediaService} from '../dist/ai/catalog/services/catalog-media.service.js';
test('nested stages preserve exact provider/model/status and discard all raw private error data',async()=>{
 const raw=Object.assign(Error('SECRET_KEY private chat https://r2.example/file?signature=SECRET'),{status:503,headers:{authorization:'SECRET'}});
 try{
  await catalogOperation({provider:'internal',stage:'enrichment'},()=>catalogOperation({provider:'google',stage:'actor-facts',model:'configured-model'},async()=>{throw raw;}));
  assert.fail('must fail');
 }catch(error){
  assert.deepEqual(catalogFailureDetails(error),{provider:'google',stage:'actor-facts',model:'configured-model',providerStatus:503,errorKind:'http'});
  assert.doesNotMatch(JSON.stringify({error,details:catalogFailureDetails(error)}),/SECRET|private chat|signature|authorization/);
 }
});
test('AWS status, timeout and invalid structured response are distinguished without SDK messages',async()=>{
 for(const [raw,status,kind] of [[{$metadata:{httpStatusCode:503}},503,'http'],[{name:'TimeoutError'},null,'timeout'],[{name:'ZodError',issues:['private']},null,'invalid-response']]){
  try{await catalogOperation({provider:'r2',stage:'image-upload'},async()=>{throw raw;});}catch(error){const info=catalogFailureDetails(error);assert.equal(info.providerStatus,status);assert.equal(info.errorKind,kind);}
 }
});
test('exhausted image candidates retain whether source download or R2 upload failed',async()=>{
 const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 for(const downloadFails of [true,false]){
  const media=createCatalogMediaService({download:async()=>{if(downloadFails)throw Object.assign(Error('private URL'),{status:503});return png;},put:async()=>{throw {$metadata:{httpStatusCode:503}};},remove:async()=>{}});
  await assert.rejects(()=>media.store('movieimg',['https://example.com/image.png'],1,()=>{},AbortSignal.timeout(1000)),error=>{
   const info=catalogFailureDetails(error);assert.equal(info.provider,downloadFails?'image-source':'r2');assert.equal(info.stage,downloadFails?'image-download':'image-upload');assert.equal(info.providerStatus,503);return true;
  });
 }
});
