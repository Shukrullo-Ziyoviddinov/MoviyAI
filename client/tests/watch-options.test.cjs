const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports','module',source)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),module.exports,module);return module.exports;}
const watchOptions=load(path.join(__dirname,'../src/utils/watch-options.ts')).watchOptions;
const provider=load(path.join(__dirname,'../src/utils/watch-provider.ts'));
const resolution=load(path.join(__dirname,'../src/utils/watch-resolution.ts'),{'./watch-provider':provider});
const first='https://asilmedia.org/123-film.html',second='https://uzmovi.net/456-film.html';
function component(native,initial=[]){
 const state=[],opened=[];let before=0;
 let stateIndex=0;
 const mocks={react:{useState:()=>[initial[stateIndex++]??false,value=>state.push(value)],useEffect(){},useRef:()=>({current:null})},'@/components/icons':{},
  '@/utils/watch-options':{watchOptions},'@/src/utils/watch-options':{watchOptions},
  '@/utils/watch-resolution':resolution,'@/src/utils/watch-resolution':resolution,
  '@/utils/watch-provider':provider,'@/src/utils/watch-provider':provider,'@/api/client':{apiBaseUrl:'https://api.example.com'},'@/src/api/client':{apiBaseUrl:'https://api.example.com'},'./WatchPlayerModal':{WatchPlayerModal:'player'},
  '@/components/theme/theme-state':{useTheme:()=>({colors:{}})},'@/src/stores/useThemeStore':{useTheme:()=>({colors:{}})},
  '@/components/language/language-state':{useLanguage:()=>({language:'uz'})},'./watch-modal-history':{watchModalHistory(){}},'@/i18n':{translate:(_lang,key)=>key},
  'react-dom':{createPortal(){}},'react-i18next':{useTranslation:()=>({t:key=>key})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},
  'react-native':{Alert:{alert(){}},Linking:{openURL:async url=>{opened.push(url);}},Modal:'modal',Pressable:'pressable',ScrollView:'scrollview',StyleSheet:{create:s=>s},Text:'text',View:'view'},
 };
 const module=load(path.join(__dirname,native?'../../clientNative/components/movie/WatchOptionModal.tsx':'../src/components/movie/WatchOptionModal.tsx'),mocks);
 return {button:movie=>module.WatchButton({movie,children:'Watch',onBeforeOpen:()=>{before++;}}),state,opened,before:()=>before};
}
for(const native of [false,true])test(`${native?'native':'web'}: single choice opens directly; multiple choices show selection; empty choices disable`,async()=>{
 const single=component(native),one=single.button({watchUrl:first,watchUrls:[first]});
 if(native){one.props.children[0].props.onPress();await Promise.resolve();assert.deepEqual(single.opened,[first]);assert.equal(single.before(),1);}
 else{assert.equal(one.type,'a');assert.equal(one.props.href,first);}
 const multiple=component(native),many=multiple.button({watchUrl:first,watchUrls:[first,second]});
 many.props.children[0].props[native?'onPress':'onClick']();
 assert.deepEqual(multiple.state,[true]);assert.deepEqual(multiple.opened,[]);
 const none=component(native).button({watchUrl:null,watchUrls:['javascript:alert(1)']});assert.equal(none.props.children[0].props.disabled,true);
});
test('web, native and server normalize the same URL list without truncating alternatives',()=>{
 const all=Array.from({length:7},(_,index)=>`https://site.example/film/${index}`);
 const movie={watchUrl:all[0],watchUrls:[...all,all[0]+'#top','javascript:alert(1)']};
 const expected=watchOptions(movie);assert.equal(expected.length,7);assert.equal(expected[0].domain,'site.example');
 for(const file of ['../../clientNative/src/utils/watch-options.ts','../../server/src/utils/watch-options.ts'])assert.deepEqual(load(path.join(__dirname,file)).watchOptions(movie),expected);
});

for(const native of [false,true])test(`${native?'native':'web'}: verifies VK first and falls back to OK before opening player`,async context=>{
 const requests=[];
 context.mock.method(globalThis,'fetch',async value=>{
  const page=new URL(value).searchParams.get('url');requests.push(page);
  return {ok:true,json:async()=>({source:page.includes('ok.ru')?{embedUrl:'https://ok.ru/videoembed/123'}:null})};
 });
 const h=component(native),tree=h.button({watchUrls:[first,'https://mover.uz/watch/Ab12/','https://ok.ru/video/123','https://vkvideo.ru/video-12_34']});
 tree.props.children[0].props[native?'onPress':'onClick']();
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual(requests,['https://vkvideo.ru/video-12_34','https://ok.ru/video/123']);
 assert.ok(h.state.includes('https://ok.ru/video/123'));assert.deepEqual(h.opened,[]);
});

for(const native of [false,true])test(`${native?'native':'web'}: unavailable embeds preserve the existing source selector`,async context=>{
 context.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({source:null})}));
 const h=component(native),tree=h.button({watchUrls:[first,'https://ok.ru/video/123']});
 tree.props.children[0].props[native?'onPress':'onClick']();
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(h.state.includes(true));assert.ok(!h.state.includes('https://ok.ru/video/123'));assert.deepEqual(h.opened,[]);
});

for(const native of [false,true])test(`${native?'native':'web'}: tries a second link on the same provider before giving up`,async context=>{
 const requests=[];
 context.mock.method(globalThis,'fetch',async value=>{
  const page=new URL(value).searchParams.get('url');requests.push(page);
  return {ok:true,json:async()=>({source:page.endsWith('/124')?{embedUrl:'https://ok.ru/videoembed/124'}:null})};
 });
 const h=component(native),tree=h.button({watchUrls:['https://ok.ru/video/123','https://ok.ru/video/124',first]});
 tree.props.children[0].props[native?'onPress':'onClick']();await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual(requests,['https://ok.ru/video/123','https://ok.ru/video/124']);assert.ok(h.state.includes('https://ok.ru/video/124'));
});

for(const native of [false,true])test(`${native?'native':'web'}: source-sheet close leaves the active player mounted`,()=>{
 const active='https://ok.ru/video/123';
 const h=component(native,[true,active]),tree=h.button({watchUrls:[active,first]});
 const player=tree.props.children[1];assert.equal(player.type,'player');assert.equal(player.props.url,active);
 player.props.children.props.onClose();
 assert.deepEqual(h.state,[false]);
});
test('native: a close request while sources are open closes only the source sheet',()=>{
 const active='https://ok.ru/video/123',h=component(true,[true,active]);
 h.button({watchUrls:[active,first]}).props.children[1].props.onClose();
 assert.deepEqual(h.state,[false]);
});
