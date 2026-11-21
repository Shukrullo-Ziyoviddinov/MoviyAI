const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const exportsForTest={};new Function('exports',ts.transpileModule(fs.readFileSync('src/components/chat/chat-viewport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exportsForTest);
const {chatViewportLayout}=exportsForTest;
function layout(extra={}){return chatViewportLayout({parentHeight:780,parentTop:0,windowHeight:780,restingHeight:780,...extra});}
test('Telegram resting bottom padding takes the larger inset once, with no extra lift',()=>{
 const result=layout({telegram:{viewportStableHeight:780,viewportHeight:780,safeAreaInset:{bottom:24},contentSafeAreaInset:{bottom:12}},visual:{height:780,offsetTop:0,scale:1}});
 assert.equal(result.height,780);assert.equal(result.bottomPadding,24);assert.equal(result.top,0);
 assert.equal(layout({telegram:{viewportStableHeight:780}}).bottomPadding,8);
});
test('visual keyboard animation wins over stale Telegram height on opening and closing',()=>{
 const telegram={viewportStableHeight:780,viewportHeight:300};
 for(const height of [780,720,640,520,400,300,400,520,640,720,780]){
  assert.equal(layout({telegram,visual:{height,offsetTop:0,scale:1}}).height,height);
 }
 assert.equal(layout({telegram,visual:{height:780,offsetTop:0,scale:1}}).keyboardOpen,false);
 assert.equal(layout({telegram,visual:{height:300,offsetTop:0,scale:1}}).bottomPadding,8);
});
test('ordinary web uses the visible keyboard height and compensates document focus panning',()=>{
 const result=layout({parentTop:-60,visual:{height:360,offsetTop:40,scale:1}});
 assert.equal(result.height,360);assert.equal(result.top,40);assert.equal(result.bottomPadding,8);
 // Input bottom is the visual viewport bottom minus one small padding, independent of message scroll.
 assert.equal(result.top+result.height-result.bottomPadding,40+360-8);
});
test('layout-resizing browsers still detect the keyboard from the resting height',()=>{
 const result=layout({parentHeight:360,windowHeight:360,visual:{height:360,offsetTop:0,scale:1}});
 assert.equal(result.keyboardOpen,true);assert.equal(result.height,360);
});
test('late Telegram stable-height updates cannot add padding above an open keyboard or hold input down on closing',()=>{
 const telegram={viewportStableHeight:300,viewportHeight:300,safeAreaInset:{bottom:24}};
 const open=layout({telegram,parentHeight:300,windowHeight:300,visual:{height:300,offsetTop:0,scale:1}});
 assert.equal(open.keyboardOpen,true);assert.equal(open.bottomPadding,8);
 const closing=layout({telegram,parentHeight:300,windowHeight:300,visual:{height:780,offsetTop:0,scale:1}});
 assert.equal(closing.height,780);assert.equal(closing.keyboardOpen,false);
});
test('older Telegram clients fall back to their current height and retain compact keyboard padding',()=>{
 const result=layout({telegram:{viewportStableHeight:780,viewportHeight:380,safeAreaInset:{bottom:24},contentSafeAreaInset:{bottom:12}}});
 assert.equal(result.height,380);assert.equal(result.bottomPadding,8);assert.equal(result.visual,false);
});
test('pinch zoom and invalid measurements do not create negative or infinite chat geometry',()=>{
 const result=layout({visual:{height:300,offsetTop:40,scale:2}});assert.equal(result.height,780);assert.equal(result.visual,false);
 const invalid=layout({parentTop:NaN,parentHeight:Infinity,windowHeight:NaN,restingHeight:680});assert.equal(invalid.height,680);assert.equal(invalid.top,0);
});
