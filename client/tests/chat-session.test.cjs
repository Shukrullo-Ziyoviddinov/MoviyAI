const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/stores/chat-session.ts'), 'utf8');
const nativeSource = fs.readFileSync(path.join(__dirname, '../../clientNative/src/stores/chat-session.ts'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const db = new Map(), storage = new Map();
  let id = 0, fail = false, calls = 0, hold, deltas = [], failDelete = false, failPin = false;
  const copy = value => JSON.parse(JSON.stringify(value));
  const api = {
    chatMediaUrl: path => 'https://test.invalid'+path,
    pinChat: async (id,pinned) => {if(failPin)throw Error('pin failed');db.get(id).pinned=pinned;return {id,pinned};},
    deleteChat: async id => { if(failDelete)throw Error('delete failed');db.delete(id);return {id}; },
    listChats: async () => [...db.values()].map(({ turns, ...chat }) => copy(chat)),
    createChat: async id => {
      if (!db.has(id)) db.set(id, { id, pinned: false, title: 'Yangi chat', updatedAt: new Date().toISOString(), turns: [] });
      return copy(db.get(id));
    },
    getChat: async id => {
      if (!db.has(id)) throw Error('not found');
      return copy(db.get(id));
    },
    sendChat: async (id, requestId, text, onDelta, media = [],onProgress=()=>{}) => {
      calls++;
      const chat = db.get(id);
      let turn = chat.turns.find(turn => turn.requestId === requestId);
      if (!turn) { turn = { requestId, text, images:media.filter(item=>item.type==='image').map((item,index)=>({id:item.id,type:'image',path:'/image-'+index+'.jpg'})),videos:media.filter(item=>item.type==='video').map(item=>({id:item.id,type:'video',path:'/video.mp4'})), answer: '', status: 'processing', createdAt: new Date().toISOString() }; chat.turns.push(turn); }
      chat.title = text;
      onProgress('searching');
      for (const delta of deltas) onDelta(delta);
      if (hold) await hold;
      if (fail) { turn.status = 'failed';turn.failureCode=typeof fail==='string'?fail:null; throw Object.assign(Error('provider failed'),{failureCode:turn.failureCode}); }
      turn.status = 'completed'; turn.answer = 'Answer'; return copy(chat);
    },
  };
  const exports = {};
  const revealExports = {};
  const revealSource = fs.readFileSync(path.join(__dirname, '../src/stores/text-reveal.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(revealSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: revealExports, setTimeout, clearTimeout });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => name.includes('text-reveal') ? revealExports : api, Date, URL, setTimeout, clearTimeout });
  const create = () => exports.createChatSession({ read: async key => storage.get(key) ?? null,
    write: async (key, value) => { storage.set(key, value); }, uuid: () => `id-${++id}` });
  return { create, db, storage, api, fail: value => { fail = value; }, failPin:value=>{failPin=value;}, failDelete: value => { failDelete=value; }, hold: value => { hold = value; }, deltas: value => { deltas = value; }, calls: () => calls };
}

test('web and native use identical session behavior', () => assert.equal(source, nativeSource));

test('real progress is observable while sending and clears when the saved reply arrives',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');let release;h.hold(new Promise(resolve=>{release=resolve;}));
 session.actions.sendMessage({text:'Question'});await tick();assert.equal(session.getState().sending,true);assert.equal(session.getState().progressStage,'searching');
 release();await tick();assert.equal(session.getState().progressStage,null);
});
test('a persisted failure reason survives reopening a chat and resets on new chat',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');h.fail('timeout');session.actions.sendMessage({text:'Question'});await tick();const id=session.getState().activeId;
 assert.equal(session.getState().failureCode,'timeout');await session.actions.openChat(id);assert.equal(session.getState().failureCode,'timeout');session.actions.newChat();assert.equal(session.getState().failureCode,null);
});

test('saved recommendations reopen as independent movie blocks in web and native session',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');
 h.db.set('rec',{id:'rec',title:'Recommendations',updatedAt:new Date().toISOString(),turns:[{requestId:'r',text:'Recommend',answer:'Intro',status:'completed',createdAt:new Date().toISOString(),recommendations:[{text:'Dossier one',movie:{title:'One'}},{text:'Dossier two',movie:{title:'Two'}}]}]});
 await session.actions.openChat('rec');
 const models=session.getState().messages.filter(item=>item.role==='model');
 assert.equal(models.length,3);assert.equal(models[1].movie.title,'One');assert.equal(models[2].movie.title,'Two');
 assert.notEqual(models[1].id,models[2].id);
});
test('list loading stops when summaries arrive; opening a chat only loads its messages', async () => {
  const h=harness(),session=h.create();
  const list=h.api.listChats;let releaseList;
  h.api.listChats=async()=>{await new Promise(resolve=>{releaseList=resolve;});return list();};
  const initialize=session.actions.initialize('alice');
  assert.equal(session.getState().listLoading,true);
  releaseList();await initialize;assert.equal(session.getState().listLoading,false);
  h.api.listChats=list;
  session.actions.sendMessage({text:'Ready chat'});await tick();const id=session.getState().activeId;
  const get=h.api.getChat;let releaseChat;
  h.api.getChat=async id=>{await new Promise(resolve=>{releaseChat=resolve;});return get(id);};
  const open=session.actions.openChat(id);
  assert.equal(session.getState().loading,true);assert.equal(session.getState().listLoading,false);
  assert.equal(session.getState().conversations.length,1);
  releaseChat();await open;assert.equal(session.getState().loading,false);
});
test('image sending preserves the preview and restores saved images after refresh', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  assert.equal(session.actions.sendMessage({media:[{id:'img',type:'image',uri:'file://frame.jpg',mimeType:'image/jpeg',fileSize:100}]}),true);
  await tick();assert.equal(session.getState().messages[0].kind,'media');assert.equal(session.getState().messages.length,3);
  const restored=h.create();await restored.actions.initialize('alice');
  assert.equal(restored.getState().messages[0].items[0].stored,true);
  assert.equal(restored.getState().messages[0].items[0].uri,'https://test.invalid/image-0.jpg');
});
test('oversized videos and images are rejected before API submission', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  assert.equal(session.actions.sendMessage({media:[{id:'v',type:'video',uri:'file://video.mp4',durationSeconds:181}]}),false);
  assert.equal(h.calls(),0);session.actions.newChat();
  assert.equal(session.actions.sendMessage({media:[{id:'i',type:'image',uri:'file://big.jpg',fileSize:5*1024*1024}]}),false);
  assert.equal(h.calls(),0);
});

test('one valid video sends and reopens as a video while mixed media is rejected',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');
 assert.equal(session.actions.sendMessage({media:[{id:'v',type:'video',uri:'blob:video',mimeType:'video/mp4',durationSeconds:120,fileSize:1000}]}),true);await tick();
 const id=session.getState().activeId;await session.actions.openChat(id);
 assert.equal(session.getState().messages[0].items[0].type,'video');assert.match(session.getState().messages[0].items[0].uri,/video.mp4/);
 session.actions.newChat();assert.equal(session.actions.sendMessage({media:[{id:'v',type:'video',uri:'v'},{id:'i',type:'image',uri:'i'}]}),false);
});
test('refreshing summaries has its own loading flag which clears on completion', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  const list=h.api.listChats;let release;
  h.api.listChats=async()=>{await new Promise(resolve=>{release=resolve;});return list();};
  session.actions.sendMessage({text:'Question'});await tick();
  assert.equal(session.getState().listLoading,true);
  release();await tick();assert.equal(session.getState().listLoading,false);
});
test('send, refresh, new chat, and reopening preserve messages', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  session.actions.sendMessage({ text: 'First chat' }); await tick();
  const id = session.getState().activeId;
  assert.equal(session.getState().messages.length, 2);
  assert.equal(session.getState().conversations[0].title, 'First chat');
  const restored = h.create(); await restored.actions.initialize('alice');
  assert.equal(restored.getState().activeId, id); assert.equal(restored.getState().messages.length, 2);
  restored.actions.newChat(); assert.equal(restored.getState().messages.length, 0);
  const blank = h.create(); await blank.actions.initialize('alice');
  assert.equal(blank.getState().activeId, null);
  await blank.actions.openChat(id); assert.equal(blank.getState().messages.length, 2);
});
test('pin and unpin survive refresh without duplicating or changing the open conversation', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  session.actions.sendMessage({text:'Pin me'});await tick();const id=session.getState().activeId;
  assert.equal(await session.actions.setPinned(id,true),true);
  assert.equal(session.getState().conversations.length,1);assert.equal(session.getState().conversations[0].pinned,true);
  assert.equal(session.getState().activeId,id);assert.equal(session.getState().messages.length,2);
  const restored=h.create();await restored.actions.initialize('alice');assert.equal(restored.getState().conversations[0].pinned,true);
  assert.equal(await restored.actions.setPinned(id,false),true);assert.equal(restored.getState().conversations[0].pinned,false);
});
test('failed pin leaves the previous state intact and can be retried', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  session.actions.sendMessage({text:'Pin me'});await tick();const id=session.getState().activeId;
  h.failPin(true);assert.equal(await session.actions.setPinned(id,true),false);
  assert.equal(session.getState().pinError,id);assert.equal(session.getState().pinningId,null);
  assert.equal(session.getState().conversations[0].pinned,false);
  h.failPin(false);assert.equal(await session.actions.setPinned(id,true),true);assert.equal(session.getState().pinError,null);
});
test('deleting an older chat preserves the active chat; deleting the active chat resets it', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  session.actions.sendMessage({text:'First'});await tick();const first=session.getState().activeId;
  session.actions.newChat();session.actions.sendMessage({text:'Second'});await tick();const second=session.getState().activeId;
  assert.equal(await session.actions.deleteConversation(first),true);
  assert.equal(session.getState().activeId,second);assert.equal(session.getState().messages.length,2);
  assert.equal(await session.actions.deleteConversation(second),true);
  assert.equal(session.getState().activeId,null);assert.equal(session.getState().messages.length,0);
  const restored=h.create();await restored.actions.initialize('alice');assert.equal(restored.getState().activeId,null);
});
test('failed deletion leaves the conversation intact and can be retried', async () => {
  const h=harness(),session=h.create();await session.actions.initialize('alice');
  session.actions.sendMessage({text:'Keep me'});await tick();const id=session.getState().activeId;
  h.failDelete(true);assert.equal(await session.actions.deleteConversation(id),false);
  assert.equal(session.getState().deleteError,id);assert.equal(session.getState().messages.length,2);
  assert.equal(session.getState().deletingId,null);
  h.failDelete(false);assert.equal(await session.actions.deleteConversation(id),true);
  assert.equal(session.getState().conversations.length,0);
});
test('failed turn survives refresh and retry reuses the request ID', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice'); h.fail(true);
  session.actions.sendMessage({ text: 'Question' }); await tick();
  const pending = session.getState().pending; assert.ok(pending); assert.equal(session.getState().messages.length, 1);
  const restored = h.create(); await restored.actions.initialize('alice');
  assert.equal(restored.getState().pending.requestId, pending.requestId);
  h.fail(false); restored.actions.retry(); restored.actions.retry(); await tick();
  assert.equal(h.calls(), 2); assert.equal(h.db.get(pending.conversationId).turns.length, 1);
  assert.equal(restored.getState().messages.length, 2); assert.equal(restored.getState().pending, null);
});
test('logout clears memory and ignores a response from the old account', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  let release; h.hold(new Promise(resolve => { release = resolve; }));
  session.actions.sendMessage({ text: 'Private' }); await tick();
  await session.actions.initialize(null); release(); await tick();
  assert.equal(session.getState().owner, null); assert.equal(session.getState().messages.length, 0);
  assert.equal(session.getState().conversations.length, 0);
});
test('latest selected conversation wins out-of-order responses', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  await h.api.createChat('a'); await h.api.createChat('b');
  const get = h.api.getChat; let release;
  h.api.getChat = async id => { if (id === 'a') await new Promise(resolve => { release = resolve; }); return get(id); };
  const first = session.actions.openChat('a'); await tick(); await session.actions.openChat('b'); release(); await first;
  assert.equal(session.getState().activeId, 'b');
});
test('live text is visible while sending and is replaced once by the saved answer', async () => {
  const h = harness(), session = h.create(); await session.actions.initialize('alice');
  h.deltas(['Ans', 'wer']); let release; h.hold(new Promise(resolve => { release = resolve; }));
  session.actions.sendMessage({ text: 'Question' });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(session.getState().streamingText, 'Answer'); assert.equal(session.getState().sending, true);
  assert.equal(session.getState().messages.length, 1);
  release(); await tick();
  assert.equal(session.getState().streamingText, ''); assert.equal(session.getState().messages.length, 2);
  assert.equal(session.getState().messages[1].text, 'Answer'); assert.equal(session.getState().sending, false);
});

test('expiring R2 links renew without clearing chat messages or showing a loading skeleton',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');
 session.actions.sendMessage({text:'Find',media:[{id:'img',type:'image',uri:'blob:frame',mimeType:'image/jpeg',fileSize:100}]});await tick();
 const id=session.getState().activeId;h.api.chatMediaUrl=path=>path;
 h.db.get(id).turns[0].images[0].path='https://r2.example/image?X-Amz-Date=20200101T000000Z&X-Amz-Expires=3600';
 await session.actions.openChat(id);const count=session.getState().messages.length;
 h.db.get(id).turns[0].images[0].path='https://r2.example/renewed';
 await session.actions.refreshMedia();assert.equal(session.getState().loading,false);assert.equal(session.getState().messages.length,count);assert.equal(session.getState().messages[0].items[0].uri,'https://r2.example/renewed');
});

test('server-assigned conversation titles appear immediately even if list refresh fails',async()=>{
 const h=harness(),session=h.create();await session.actions.initialize('alice');
 const send=h.api.sendChat;
 h.api.sendChat=async(...args)=>{const chat=await send(...args);chat.title='Interstellar (2014)';h.db.get(chat.id).title=chat.title;return chat;};
 h.api.listChats=async()=>{throw Error('summary refresh unavailable');};
 session.actions.sendMessage({text:'Rasmdagi kinoni top'});await tick();await tick();
 assert.equal(session.getState().conversations[0].title,'Interstellar (2014)');
 assert.notEqual(session.getState().conversations[0].title,'Rasmdagi kinoni top');
});
