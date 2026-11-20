const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);return module.exports;}
const provider=load('src/utils/watch-provider.ts');
function player(url,embed){
 let index=0;const states=[embed,false,true];
 const mocks={react:{useState:()=>[states[index++],()=>{}],useEffect(){}},'react-native':{AppState:{currentState:'active'},Linking:{},Modal:'modal',Pressable:'pressable',Text:'text',View:'view'},'react-native-webview':{WebView:'webview'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'react-i18next':{useTranslation:()=>({i18n:{language:'uz'}})},'@/src/api/client':{apiBaseUrl:'https://api.example.com'},'@/src/utils/watch-provider':provider,'@/src/utils/watch-resolution':{resolveWatchSource:async()=>null}};
 return load('components/movie/WatchPlayerModal.tsx',mocks).WatchPlayerModal({url,title:'Film',onClose(){},onOther(){},hasOther:false});
}
function find(tree,type){if(!tree||typeof tree!=='object')return null;if(tree.type===type)return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found;}return null;}
test('provider subframes may load while top-level navigation stays on the verified embed',()=>{
 const tree=player('https://ok.ru/video/123','https://ok.ru/videoembed/123'),frame=find(tree,'webview');assert.ok(frame);
 const allow=frame.props.onShouldStartLoadWithRequest;
 assert.equal(allow({url:'https://ok.ru/videoembed/123',isTopFrame:true}),true);
 assert.equal(allow({url:'https://ok.ru/videoembed/124',isTopFrame:true}),false);
 assert.equal(allow({url:'https://cdn.example.com/player',isTopFrame:false}),true);
 assert.equal(allow({url:'https://evil.example.com/',isTopFrame:true}),false);
 assert.equal(allow({url:'file:///private',isTopFrame:false}),false);
 assert.equal(allow({url:'javascript:alert(1)',isTopFrame:false}),false);
});
test('switching to a different source cannot render the previous film for a frame',()=>{
 assert.equal(find(player('https://ok.ru/video/124','https://ok.ru/videoembed/123'),'webview'),null);
});
