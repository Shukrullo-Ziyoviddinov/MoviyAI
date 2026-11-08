import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../dist/ai/services/direct-image.service.js',import.meta.url),'utf8')
 .replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
function harness(){
 let deleted=false,consumed=false,locked=false,bad=false;const rows=[],removed=[],lifetimes=[];
 const match=(row,query)=>Object.entries(query).every(([key,value])=>value?.$lte?row[key]<=value.$lte:row[key]===value);
 const ChatUpload={
  updateOne:async(query,patch)=>{if(!rows.some(row=>match(row,query)))rows.push({_id:'upload',...query,...patch.$setOnInsert});},
  findOne:query=>({lean:async()=>rows.find(row=>match(row,query))}),
  find:query=>({limit(){return this;},lean:async()=>rows.filter(row=>match(row,query))}),
  deleteOne:async query=>{const index=rows.findIndex(row=>match(row,query));if(index>=0)rows.splice(index,1);},
 };
 class Schema{index(){}}
 const Conversation={exists:async query=>query.userId==='alice'&&!deleted&&(!query.lockUntil||locked)};
 const ChatTurn={findOne:()=>({select(){return this;},lean:async()=>consumed?{images:rows[0].images}:null})};
 const chatImageKey=(id,req,index,hash)=>`chatimg/${id}/${req}/${index}-${hash}`;
 const api=new Function('Schema','model','Conversation','ChatTurn','chatImageKey','signChatImage','inspectChatImage','deleteChatImage',source+
 '\nreturn {reserveImages,resolveDirectImages,cleanupExpiredUploads,cleanupReservedImages};')
 (Schema,()=>ChatUpload,Conversation,ChatTurn,chatImageKey,async(key,method,_mime,_size,lifetime)=>{lifetimes.push(lifetime);return `https://r2.example/${method}/${key}`;},
 async()=>({size:bad?99:12,mimeType:'image/jpeg',bytes:Buffer.from([255,216,255])}),async key=>{removed.push(key);});
 return {...api,rows,removed,lifetimes,deleted:()=>{deleted=true;},consumed:()=>{consumed=true;},locked:value=>{locked=value;},bad:()=>{bad=true;}};
}
const descriptor={hash:'a'.repeat(64),size:12,mimeType:'image/jpeg'};
test('upload reservation is owner-scoped, idempotent and cannot change attachments',async()=>{
 const h=harness();await assert.rejects(()=>h.reserveImages('bob','chat','request',[descriptor]));
 const first=await h.reserveImages('alice','chat','request',[descriptor]);
 assert.match(first[0].url,/https:\/\/r2.example\/PUT/);assert.equal(first[0].headers['Content-Type'],'image/jpeg');
 await h.reserveImages('alice','chat','request',[descriptor]);assert.equal(h.rows.length,1);
 await assert.rejects(()=>h.reserveImages('alice','chat','request',[{...descriptor,hash:'b'.repeat(64)}]));
 const refs=await h.resolveDirectImages('alice','chat','request');assert.equal(refs[0].data,undefined);assert.equal(refs[0].hash,descriptor.hash);
 h.bad();await assert.rejects(()=>h.resolveDirectImages('alice','chat','request'));
});
test('renewed PUT URLs cannot outlive their reservation cleanup deadline',async()=>{
 const h=harness();await h.reserveImages('alice','chat','request',[descriptor]);
 h.rows[0].expiresAt=new Date(Date.now()+120000);await h.reserveImages('alice','chat','request',[descriptor]);
 assert.ok(h.lifetimes.at(-1)<=60);
 h.rows[0].expiresAt=new Date(Date.now()+30000);await assert.rejects(()=>h.reserveImages('alice','chat','request',[descriptor]));
});
test('expired abandoned uploads are removed; active turns retain images',async()=>{
 const h=harness();await h.reserveImages('alice','chat','request',[descriptor]);h.rows[0].expiresAt=new Date(0);
 h.locked(true);await h.cleanupExpiredUploads();assert.equal(h.removed.length,0);assert.equal(h.rows.length,1);
 h.locked(false);h.consumed();await h.cleanupExpiredUploads();assert.equal(h.removed.length,0);assert.equal(h.rows.length,0);
 const orphan=harness();await orphan.reserveImages('alice','chat','request',[descriptor]);orphan.rows[0].expiresAt=new Date(0);
 await orphan.cleanupExpiredUploads();assert.equal(orphan.removed.length,1);assert.equal(orphan.rows.length,0);
});
test('deleting a chat cleans reservations now and again after outstanding PUT URLs expire',async()=>{
 const h=harness();await h.reserveImages('alice','chat','request',[descriptor]);h.deleted();
 await h.cleanupReservedImages('alice','chat');assert.equal(h.removed.length,1);assert.equal(h.rows.length,1);
 h.rows[0].expiresAt=new Date(0);await h.cleanupExpiredUploads();assert.equal(h.removed.length,2);assert.equal(h.rows.length,0);
});
