const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);return module.exports;}
const {createNativeChatStorage}=load('src/stores/native-chat-storage.ts');
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
test('the same app process retains the current chat and can restore its selection',async()=>{
 const storage=createNativeChatStorage(()=> 'id'),chat=session(storage);await chat.actions.initialize('alice');await chat.actions.openChat('old-chat');
 assert.equal(chat.getState().activeId,'old-chat');assert.equal(chat.getState().messages.length,2);
 const sameProcess=session(storage);await sameProcess.actions.initialize('alice');
 assert.equal(sameProcess.getState().activeId,'old-chat');assert.equal(sameProcess.getState().messages.length,2);
 assert.equal(sameProcess.getState().conversations.length,1);
});
