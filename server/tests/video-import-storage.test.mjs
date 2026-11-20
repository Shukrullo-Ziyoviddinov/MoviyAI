import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createVideoWorkspace } from '../dist/ai/video-import/services/video-workspace.service.js';
import { createVideoImportStorage, videoImportObjectKey } from '../dist/ai/video-import/services/video-import-storage.service.js';
import { createVideoImportProcessor } from '../dist/ai/video-import/services/video-import-processor.service.js';

const metadata={durationSeconds:1,sizeBytes:32,width:320,height:240,mimeType:'video/mp4',hasAudio:false};
const job=()=>({id:'a'.repeat(64),canonicalUrl:'https://www.instagram.com/reel/fixture/',platform:'instagram',videoId:'fixture',metadata:{...metadata},r2Key:null});
test('WebM keys preserve the hash and enforce matching R2 content type', async () => {
 const hash='b'.repeat(64), key=videoImportObjectKey('a'.repeat(64),hash,'video/webm');
 assert.ok(key.endsWith('.webm'));
 let type='video/webm';
 const storage=createVideoImportStorage({bucket:()=> 'test',client:()=>({send:async()=>({ContentLength:32,ContentType:type,Metadata:{sha256:hash}})})});
 assert.equal((await storage.inspect(key,new AbortController().signal)).sha256,hash);
 type='video/mp4';
 await assert.rejects(()=>storage.inspect(key,new AbortController().signal),{code:'INVALID_R2_OBJECT'});
});
test('R2 upload uses a bounded file stream, explicit length/checksum and private key namespace',async()=>{
  const workspace=await createVideoWorkspace();const file=join(workspace.directory,'fixture.mp4');
  const bytes=Buffer.alloc(32,1),hash=createHash('sha256').update(bytes).digest('hex'),key=videoImportObjectKey('a'.repeat(64),hash);
  let sent=0;
  const storage=createVideoImportStorage({bucket:()=> 'test',client:()=>({send:async(command)=>{
    sent++;const input=command.input;assert.equal(input.Key,key);
    assert.ok(input.Body instanceof Readable);assert.equal(Buffer.isBuffer(input.Body),false);
    assert.equal(input.Body.readableHighWaterMark,256*1024);assert.equal(input.ContentLength,bytes.length);
    assert.equal(input.CacheControl,'private, no-store');assert.equal(input.ChecksumSHA256,Buffer.from(hash,'hex').toString('base64'));
    const received=[];for await(const chunk of input.Body)received.push(chunk);
    assert.deepEqual(Buffer.concat(received),bytes);return {};
  }})});
  try{
    await writeFile(file,bytes);await storage.upload(key,file,bytes.length,new AbortController().signal);
    await assert.rejects(()=>storage.upload(key,file,33,new AbortController().signal),{code:'INVALID_R2_OBJECT'});
    await assert.rejects(()=>storage.upload('movieimg/no',file,32,new AbortController().signal),{code:'INVALID_R2_OBJECT'});
    assert.equal(sent,1);
  }finally{await workspace.cleanup();}
  await assert.rejects(()=>access(file),{code:'ENOENT'});
});
test('HEAD distinguishes missing objects from provider failure and rejects mismatched stored metadata',async()=>{
 const key=videoImportObjectKey('a'.repeat(64),'b'.repeat(64));let mode='missing';
 const storage=createVideoImportStorage({bucket:()=> 'test',client:()=>({send:async()=>{
  if(mode==='missing')throw Object.assign(Error(),{$metadata:{httpStatusCode:404}});
  if(mode==='failed')throw Object.assign(Error('raw provider secret'),{$metadata:{httpStatusCode:503}});
  return{ContentLength:32,ContentType:'video/mp4',Metadata:{sha256:mode==='valid'?'b'.repeat(64):'wrong'}};
 }})});
 assert.equal(await storage.inspect(key,new AbortController().signal),null);
 mode='failed';await assert.rejects(()=>storage.inspect(key,new AbortController().signal),{code:'R2_UNAVAILABLE',message:'R2_UNAVAILABLE'});
 mode='bad';await assert.rejects(()=>storage.inspect(key,new AbortController().signal),{code:'INVALID_R2_OBJECT'});
 mode='valid';assert.equal((await storage.inspect(key,new AbortController().signal)).sizeBytes,32);
});
test('processor durably reserves the key before upload, then verifies it; retry reuses R2',async()=>{
 const row=job(),events=[];let available=false,downloads=0;
 const storage={inspect:async()=>available?{sizeBytes:32,sha256:'b'.repeat(64)}:null,
 upload:async key=>{assert.equal(row.r2Key,key);events.push('put');available=true;}};
 const processor=createVideoImportProcessor({storage,downloader:{withVideo:async(_url,consume,options)=>{
  downloads++;await options.onProgress('downloading');
  return consume({source:{canonicalUrl:row.canonicalUrl,videoId:'fixture'},sha256:'b'.repeat(64),filePath:'owned-file',metadata},options.signal);
 }}});
 const checkpoint=async patch=>{events.push(patch.stage);Object.assign(row,patch);};
 const result=await processor(row,new AbortController().signal,checkpoint);
 assert.ok(events.indexOf('uploading')<events.indexOf('put'));assert.equal(result.r2Key,row.r2Key);
 assert.deepEqual(await processor(row,new AbortController().signal,checkpoint),result);assert.equal(downloads,1);
});
test('failed checkpoint prevents upload, while a failed PUT retains its durable retry key',async()=>{
 for(const mode of ['checkpoint','upload']){
  const row=job();let puts=0;
  const processor=createVideoImportProcessor({storage:{inspect:async()=>null,upload:async()=>{puts++;throw Object.assign(Error(),{code:'R2_UNAVAILABLE'});}},
   downloader:{withVideo:async(_url,consume,options)=>consume({source:{canonicalUrl:row.canonicalUrl,videoId:'fixture'},sha256:'b'.repeat(64),filePath:'owned-file',metadata},options.signal)}});
  await assert.rejects(()=>processor(row,new AbortController().signal,async patch=>{if(mode==='checkpoint')throw Error('DB offline');Object.assign(row,patch);}));
  assert.equal(puts,mode==='checkpoint'?0:1);assert.equal(!!row.r2Key,mode==='upload');
 }
});
test('stop during PUT aborts the file stream and closes its file handle',async()=>{
 const workspace=await createVideoWorkspace(),file=join(workspace.directory,'fixture.mp4');
 const controller=new AbortController();let body;
 const key=videoImportObjectKey('a'.repeat(64),'b'.repeat(64));
 const storage=createVideoImportStorage({bucket:()=> 'test',client:()=>({send:async(command,options)=>{
  body=command.input.Body;controller.abort(Error('stopped'));options.abortSignal.throwIfAborted();
 }})});
 try{await writeFile(file,Buffer.alloc(32));await assert.rejects(()=>storage.upload(key,file,32,controller.signal),/stopped/);assert.equal(body.destroyed,true);}
 finally{await workspace.cleanup();}
});
