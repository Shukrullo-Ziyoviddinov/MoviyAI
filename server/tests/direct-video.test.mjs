import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAT_VIDEO} from '../dist/ai/config/chat-video.config.js';
const source=readFileSync(new URL('../dist/ai/services/direct-video.service.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
function harness(){
 const rows=[],removed=[];let deleted=false,locked=false,saved=false,duration=12;
 const match=(row,q)=>Object.entries(q).every(([key,value])=>value?.$lte?row[key]<=value.$lte:row[key]===value);
 const uploads={updateOne:async(q,p)=>{if(!rows.some(r=>match(r,q)))rows.push({_id:'v',...q,...p.$setOnInsert});},findOne:q=>({lean:async()=>rows.find(r=>match(r,q))}),find:q=>({limit(){return this;},lean:async()=>rows.filter(r=>match(r,q))}),deleteOne:async q=>{const i=rows.findIndex(r=>match(r,q));if(i>=0)rows.splice(i,1);}};
 class Schema{index(){}}
 const Conversation={exists:async q=>q.userId==='alice'&&!deleted&&(!q.lockUntil||locked)};
 const turn=()=>saved?{images:[],videos:[{...rows[0],duration}]}:null;
 const ChatTurn={findOne:()=>({lean:async()=>turn()}),find:()=>({lean:async()=>turn()?[turn()]:[]})};
 const key=(c,r,h)=>`chatvideo/${c}/${r}/0-${h}`;
 const api=new Function('Schema','model','Conversation','ChatTurn','chatVideoKey','signChatImage','inspectChatVideo','deleteChatImage','CHAT_VIDEO',source+'\nreturn {reserveVideo,resolveDirectVideo,chatVideoUrls,cleanupConversationVideos,cleanupExpiredVideos};')
 (Schema,()=>uploads,Conversation,ChatTurn,key,async(k,m)=>`https://r2.example/${m}/${k}`,async()=>({size:100,mimeType:'video/mp4',duration}),async k=>{removed.push(k);},CHAT_VIDEO);
 return {...api,rows,removed,deleted:()=>deleted=true,locked:value=>locked=value,saved:()=>saved=true,duration:value=>duration=value};
}
const input={hash:'a'.repeat(64),size:100,mimeType:'video/mp4'};
test('video reservations are owner-scoped, idempotent and cannot replace attachments',async()=>{
 const h=harness();await assert.rejects(()=>h.reserveVideo('bob','c','r',input));
 const first=await h.reserveVideo('alice','c','r',input);assert.match(first.url,/\/PUT\/chatvideo\//);
 await h.reserveVideo('alice','c','r',input);assert.equal(h.rows.length,1);
 await assert.rejects(()=>h.reserveVideo('alice','c','r',{...input,hash:'b'.repeat(64)}));
 await assert.rejects(()=>h.reserveVideo('alice','c','r',{...input,size:81*1024*1024}));
});
test('server metadata duration is enforced before Gemini and stored retries get fresh R2 URLs',async()=>{
 const h=harness();await h.reserveVideo('alice','c','r',input);
 const refs=await h.resolveDirectVideo('alice','c','r');assert.equal(refs[0].duration,12);
 const urls=await h.chatVideoUrls('alice','c','r',refs);assert.match(urls[0].fileUri,/\/GET\/chatvideo\//);assert.equal(urls[0].durationSeconds,12);
 h.duration(181);await assert.rejects(()=>h.resolveDirectVideo('alice','c','r'),/VIDEO_CHANGED/);
});
test('abandoned video cleanup preserves active turns and locks, while deletion retains late-PUT cleanup records',async()=>{
 const h=harness();await h.reserveVideo('alice','c','r',input);h.rows[0].expiresAt=new Date(0);h.locked(true);
 await h.cleanupExpiredVideos();assert.equal(h.rows.length,1);assert.equal(h.removed.length,0);
 h.locked(false);h.saved();await h.cleanupExpiredVideos();assert.equal(h.removed.length,0);assert.equal(h.rows.length,0);
 const next=harness();await next.reserveVideo('alice','c','r',input);next.deleted();await next.cleanupConversationVideos('alice','c');assert.equal(next.rows.length,1);assert.equal(next.removed.length,1);
 next.rows[0].expiresAt=new Date(0);await next.cleanupExpiredVideos();assert.equal(next.rows.length,0);assert.equal(next.removed.length,2);
});
