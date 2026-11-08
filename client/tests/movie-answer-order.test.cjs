const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const base=path.join(__dirname,'../src/components/chat');
const source=fs.readFileSync(path.join(base,'movie-answer-order.ts'),'utf8');
const exported={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported});
const text='### Mazmuni — spoylerlarsiz\n\nFilm voqealari.\n\n### Asosiy aktyorlar\n1. **Actor** — Role\n\nSiz izlagan kino shumi?\n\n### Asosiy qahramonlar\n- **Hero (Hero):** Qahramon tavsifi.';
test('saved movie answers split into sections independent of their previous order',()=>{
 const parts=exported.splitMovieAnswer(text);assert.equal(parts.about,'Film voqealari.');assert.match(parts.characters,/Hero/);assert.match(parts.cast,/Actor/);assert.doesNotMatch(parts.cast,/Siz izlagan/);assert.equal(parts.confirmation,'Siz izlagan kino shumi?');
 assert.equal(source,fs.readFileSync(path.join(__dirname,'../../clientNative/components/chat/movie-answer-order.ts'),'utf8'));
});
test('Russian and English confirmation questions move out of character and cast sections',()=>{
 for(const [heading,question] of [['Main cast','Is this the film you were looking for?'],['Главные актёры','Это тот фильм, который вы искали?']]){
  const parts=exported.splitMovieAnswer('### '+heading+'\n1. **Actor**\n'+question);assert.equal(parts.confirmation,question);assert.doesNotMatch(parts.cast,/\?/);
 }
});
test('render order is about, names, posters, table, characters, cast, sources, then one confirmation',()=>{
 const locale=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/i18n/locales/uz.json'),'utf8'));
 const colors={panel:'#070a12',panelSoft:'#0a0e18',text:'#fff',textMuted:'#888',borderSoft:'#223',accentBright:'#36f'};
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  const input=fs.readFileSync(file,'utf8');
  vm.runInNewContext(ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
   exports,URL,require:name=>{
    if(name.includes('theme-state'))return {useTheme:()=>({colors})};
    if(name.includes('useT'))return {useT:()=>key=>key.split('.').reduce((value,key)=>value?.[key],locale)??key};
    if(name==='./chat-state')return {useChat:()=>({openViewer(){}})};
    if(name.startsWith('.')){const target=path.resolve(path.dirname(file),name);return load(fs.existsSync(target+'.tsx')?target+'.tsx':target+'.ts');}
    return require(name);
   },
  });return exports;
 }
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const movie={uzbekLinks:[{title:'Uzbek movie detail',site:'uzmovi.net',url:'https://uzmovi.net/123-example.html'}],title:'Example',titleUz:'Misol',titleRu:'Пример',year:1991,posters:[{url:'https://example.com/poster.jpg'}],sources:[{title:'Manba sahifasi',url:'https://example.com/source'}],trailer:{videoId:'zSWdZVtXT7E',url:'https://www.youtube.com/watch?v=zSWdZVtXT7E',title:'Example film trailer',channel:'Film studio',kind:'trailer'}};
 const {MovieAnswer}=load(path.join(base,'MovieAnswer.tsx'));
 const html=renderToStaticMarkup(React.createElement(MovieAnswer,{text,movie}));
 const markers=['Kino haqida','UZ:','poster.jpg','Example film trailer','<table','Asosiy qahramonlar','Asosiy aktyorlar','Uzbek movie detail','Manbalar','Siz izlagan kino shumi?'];
 let previous=-1;for(const marker of markers){const position=html.indexOf(marker);assert.ok(position>previous,marker+' must follow preceding section');previous=position;}
 assert.equal(html.split('Siz izlagan kino shumi?').length-1,1);
 assert.match(html,/i.ytimg.com/);assert.doesNotMatch(html,/<iframe/);assert.match(html,/YouTube/);
 const followup=renderToStaticMarkup(React.createElement(MovieAnswer,{text:'Found Uzbek links',movie:{...movie,linksOnly:true}}));
 assert.match(followup,/Uzbek movie detail/);assert.match(followup,/Found Uzbek links/);assert.doesNotMatch(followup,/<table|i.ytimg.com|Siz izlagan kino shumi/);
});
