const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);return module.exports;}
const {createNativeChatStorage}=load('src/stores/native-chat-storage.ts');
const {createChatVisitHandler}=load('src/stores/native-chat-visit.ts');
const reveal=load('src/stores/text-reveal.ts');
const turn={requestId:'request',text:'Old question',answer:'Old answer',status:'completed',createdAt:new Date().toISOString()};
const oldChat={id:'old-chat',title:'Interstellar',pinned:false,updatedAt:new Date().toISOString(),turns:[turn]};
function session(storage){let opened=0;const api={listChats:async()=>[{...oldChat,turns:undefined}],getChat:async()=>{opened++;return structuredClone(oldChat);},chatMediaUrl:value=>value};const {createChatSession}=load('src/stores/chat-session.ts',{'./text-reveal':reveal,'../api/chat':api});return {...createChatSession(storage),opened:()=>opened};}

test('a fresh native launch opens blank chat while saved conversations remain available',async()=>{
 const previous=createNativeChatStorage(()=> 'id');await previous.write('moviy.activeChat.alice','old-chat');
 const fresh=session(createNativeChatStorage(()=> 'id'));await fresh.actions.initialize('alice');
 assert.equal(fresh.getState().activeId,null);assert.equal(fresh.getState().messages.length,0);assert.equal(fresh.getState().conversations[0].id,'old-chat');assert.equal(fresh.opened(),0);
 await fresh.actions.openChat('old-chat');assert.equal(fresh.getState().activeId,'old-chat');assert.equal(fresh.getState().messages.length,2);
});
test('returning after leaving the app clears selection without deleting old conversations',async()=>{
 const storage=createNativeChatStorage(()=> 'id'),chat=session(storage);await chat.actions.initialize('alice');await chat.actions.openChat('old-chat');
 let pending;
 const change=createChatVisitHandler(()=>{storage.clear();pending=chat.actions.initialize('alice');},()=>false);
 change('background');change('active');await pending;
 assert.equal(chat.getState().activeId,null);assert.equal(chat.getState().messages.length,0);assert.equal(chat.getState().conversations.length,1);
 await chat.actions.openChat('old-chat');assert.equal(chat.getState().messages.length,2);
});
test('gallery return keeps chat whether picking ends before or after AppState active',()=>{
 for(const finishBeforeActive of [true,false]){
  let picking=true,resets=0;const change=createChatVisitHandler(()=>resets++,()=>picking);
  change('background');if(finishBeforeActive)picking=false;
  change('background');change('inactive');change('active');picking=false;
  assert.equal(resets,0);
  change('background');change('active');assert.equal(resets,1);
 }
});
test('notification/inactive changes and duplicate active events do not reset the chat',()=>{
 let resets=0;const change=createChatVisitHandler(()=>resets++,()=>false);
 change('inactive');change('active');change('active');assert.equal(resets,0);
 change('background');change('active');change('active');assert.equal(resets,1);
});
