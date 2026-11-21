const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const exportsForTest={};new Function('exports',ts.transpileModule(fs.readFileSync('src/components/telegram/telegram-chat-viewport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exportsForTest);
const {telegramChatHeight}=exportsForTest;
test('Telegram chat follows the live keyboard height instead of stable full-screen height',()=>{
 assert.equal(telegramChatHeight({viewportHeight:380,viewportStableHeight:780},800),380);
 assert.equal(telegramChatHeight({viewportHeight:780,viewportStableHeight:780},800,{height:360,offsetTop:0,scale:1}),360);
});
test('closing the keyboard restores the full chat viewport',()=>{
 const tg={viewportHeight:780,viewportStableHeight:780};
 assert.equal(telegramChatHeight(tg,800,{height:780,offsetTop:0,scale:1}),780);
});
test('panned visual viewports use their bottom edge and pinch zoom does not resize the chat',()=>{
 const tg={viewportHeight:780,viewportStableHeight:780};
 assert.equal(telegramChatHeight(tg,800,{height:360,offsetTop:100,scale:1}),460);
 assert.equal(telegramChatHeight(tg,800,{height:360,offsetTop:0,scale:2}),780);
});
test('older clients and invalid measurements use safe fallbacks',()=>{
 assert.equal(telegramChatHeight({viewportHeight:NaN,viewportStableHeight:700},800),700);
 assert.equal(telegramChatHeight({},680),680);
 assert.equal(telegramChatHeight({viewportHeight:-1},680,{height:Infinity,offsetTop:0,scale:1}),680);
});
