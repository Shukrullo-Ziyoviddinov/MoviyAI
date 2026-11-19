import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { mkdir, mkdtemp, writeFile, utimes, access, rm } from 'node:fs/promises';
import { createVideoImportCleanup } from '../dist/ai/video-import/services/video-import-cleanup.service.js';
import { createVideoWorkspace, cleanupAbandonedVideoWorkspaces } from '../dist/ai/video-import/services/video-workspace.service.js';
import { VIDEO_IMPORT_SERVER_ROOT } from '../dist/ai/video-import/config/video-tools.config.js';
import { abortVideoImport, registerVideoImport } from '../dist/ai/video-import/services/video-import-controls.service.js';
import { ChatFailure } from '../dist/ai/types/chat-progress.types.js';
import { readFileSync } from 'node:fs';
const key=(hash='b')=>`videoimport/${'a'.repeat(64)}/${hash.repeat(64)}.mp4`;
function harness(){
 const row={_id:'a'.repeat(64),ownerKind:'user',ownerId:'owner',conversationId:'chat',requestId:'request',createdAt:new Date(0),deletedAt:null,r2Key:key(),reservedKeys:[key(),key('c')],cleanupAttempts:0};
 let now=new Date(),deleted=true,fail=false,purged=false;const removed=[],events=[];
 const repository={candidates:async(_now,scope)=>purged||scope&&scope.userId!=='owner'?[]:[row],deletedConversation:async owner=>owner==='owner'&&deleted,
 shouldDelete:async()=>deleted,mark:async()=>{row.deletedAt??=now;events.push('mark');return row;},
 defer:async(_row,when,attempts,pending)=>{Object.assign(row,{cleanupNextAt:when,cleanupAttempts:attempts,cleanupPending:pending});},
 complete:async()=>{events.push('complete');purged=true;row.r2Key=null;row.reservedKeys=[];},removeFinishedResults:async()=>events.push('result-cleanup')};
 const service=createVideoImportCleanup({repository,storage:{remove:async k=>{events.push('remove');if(fail)throw Error('R2 failed https://secret');removed.push(k);}},
 abort:()=>events.push('abort'),cleanLocal:async()=>events.push('local-cleanup'),now:()=>now});
 return{row,service,removed,events,deleted:value=>{deleted=value;},fail:value=>{fail=value;},advance:ms=>{now=new Date(+now+ms);},now:()=>now};
}
test('deleted conversation removes every owned reservation before clearing references; foreign cleanup does nothing',async()=>{
 const h=harness();assert.equal(await h.service.conversation('other','chat'),false);assert.deepEqual(h.events,[]);
 assert.equal(await h.service.conversation('owner','chat'),true);assert.deepEqual(h.removed,[key(),key('c')]);assert.equal(h.row.r2Key,null);
 assert.ok(h.events.indexOf('abort')<h.events.indexOf('remove'));assert.ok(h.events.lastIndexOf('remove')<h.events.indexOf('complete'));
 assert.equal(await h.service.conversation('owner','chat'),true);assert.equal(h.removed.length,2);
});
test('R2 failure retains every key and backs off; the same deletion completes safely on retry',async()=>{
 const h=harness();h.fail(true);assert.equal(await h.service.conversation('owner','chat'),false);
 assert.equal(h.row.r2Key,key());assert.equal(h.row.reservedKeys.length,2);assert.equal(h.row.cleanupAttempts,1);
 const calls=h.events.length;await h.service.conversation('owner','chat');assert.equal(h.events.length,calls);
 h.advance(60001);h.fail(false);assert.equal(await h.service.conversation('owner','chat'),true);
});
test('active upload/recognition barrier defers deletion, then purges after the persisted safety window',async()=>{
 const h=harness();h.row.cleanupNotBefore=new Date(+h.now()+60000);
 assert.equal(await h.service.conversation('owner','chat'),false);assert.deepEqual(h.removed,[]);
 h.advance(60001);assert.equal(await h.service.conversation('owner','chat'),true);
});
test('stopped/retry media in a live conversation is retained; foreign object keys are never deleted',async()=>{
 const h=harness();h.deleted(false);await h.service.runOnce();assert.deepEqual(h.removed,[]);assert.equal(h.row.r2Key,key());
 h.deleted(true);h.row.reservedKeys.push(`videoimport/${'d'.repeat(64)}/${'e'.repeat(64)}.mp4`);
 assert.equal(await h.service.conversation('owner','chat'),false);assert.deepEqual(h.removed,[]);assert.equal(h.row.r2Key,key());
});
test('local stop signals abort only controllers registered for that import',()=>{
 const a=new AbortController(),b=new AbortController();const releaseA=registerVideoImport('a',a),releaseB=registerVideoImport('b',b);
 try{abortVideoImport('a',new ChatFailure('stopped'));assert.equal(a.signal.aborted,true);assert.equal(b.signal.aborted,false);}finally{releaseA();releaseB();}
});
test('orphan sweep removes a dead stale workspace, preserves live/recent work and stays inside its fixed root',async()=>{
 const root=join(VIDEO_IMPORT_SERVER_ROOT,'.video-import-tmp');await mkdir(root,{recursive:true});
 const stale=await mkdtemp(join(root,'job-')),live=await createVideoWorkspace(),old=new Date(Date.now()-7200000);
 try{
  await writeFile(join(stale,'.owner.json'),JSON.stringify({pid:2147483647}));await writeFile(join(stale,'part.mp4'),'test');
  await utimes(join(stale,'.owner.json'),old,old);
  await cleanupAbandonedVideoWorkspaces();await assert.rejects(()=>access(stale),{code:'ENOENT'});await access(live.directory);
 }finally{await live.cleanup();assert.equal(dirname(stale),root);await rm(stale,{recursive:true,force:true});}
});
test('Mongo cleanup barriers include both download and recognition leases, and result cleanup retains catalog outboxes/tombstones',async()=>{
 const now=new Date(),until=new Date(+now+210000),changes=[];
 const saved={_id:'a'.repeat(64),deletedAt:now,leaseToken:'downloading',leaseUntil:new Date(+now+60000),r2Key:key(),reservedKeys:[key()]};
 const jobs={findOneAndUpdate:()=>({lean:async()=>saved}),updateOne:async(filter,patch)=>changes.push({filter,patch})};
 const results={findOneAndUpdate:()=>({lean:async()=>({leaseToken:'analyzing',leaseUntil:until})}),updateMany:async(filter,patch)=>changes.push({filter,patch})};
 const source=readFileSync(new URL('../dist/ai/video-import/repositories/video-import-cleanup.repository.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
 const repo=new Function('VideoImportJobModel','VideoRecognitionModel','Conversation','BotUpdate',source+'\nreturn videoImportCleanupRepository;')(jobs,results,{},{});
 const marked=await repo.mark(saved,now);assert.equal(+marked.cleanupNotBefore,+until+60000);assert.equal(marked.r2Key,key());
 await repo.removeFinishedResults(now);const last=changes.at(-1);assert.deepEqual(last.filter.catalogDispatch,{$ne:'pending'});
 assert.ok(last.patch.$unset.result!==undefined);assert.equal(last.patch.$unset.deletedAt,undefined);
});
test('cleanup eligibility keeps active UI and Telegram owners, but handles deletion, expiry and old orphans',async()=>{
 let conversation=null,update=null;
 const Conversation={findById:()=>({select(){return this;},lean:async()=>conversation})};
 const BotUpdate={findOne:()=>({select(){return this;},lean:async()=>update})};
 const source=readFileSync(new URL('../dist/ai/video-import/repositories/video-import-cleanup.repository.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
 const repo=new Function('VideoImportJobModel','VideoRecognitionModel','Conversation','BotUpdate',source+'\nreturn videoImportCleanupRepository;')({},{},Conversation,BotUpdate);
 const now=new Date(),row={ownerKind:'user',ownerId:'owner',conversationId:'chat',requestId:'request',createdAt:new Date(+now-2*86400000)};
 conversation={deletedAt:null,userId:'owner'};assert.equal(await repo.shouldDelete(row,now),false);
 conversation={deletedAt:now,userId:'owner'};assert.equal(await repo.shouldDelete(row,now),true);
 conversation=null;assert.equal(await repo.shouldDelete(row,now),true);assert.equal(await repo.shouldDelete({...row,createdAt:now},now),false);
 row.ownerKind='telegram';row.requestId='telegram-42';update={expiresAt:new Date(+now+86400000)};assert.equal(await repo.shouldDelete(row,now),false);
 update.expiresAt=new Date(+now-1);assert.equal(await repo.shouldDelete(row,now),true);
});
