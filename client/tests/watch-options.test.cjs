const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports','module',source)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),module.exports,module);return module.exports;}
const watchOptions=load(path.join(__dirname,'../src/utils/watch-options.ts')).watchOptions;
const first='https://asilmedia.org/123-film.html',second='https://uzmovi.net/456-film.html';
function component(native){
 const state=[],opened=[];let before=0;
 const mocks={react:{useState:()=>[false,value=>state.push(value)],useEffect(){},useRef:()=>({current:null})},'@/components/icons':{},
  '@/utils/watch-options':{watchOptions},'@/src/utils/watch-options':{watchOptions},
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
