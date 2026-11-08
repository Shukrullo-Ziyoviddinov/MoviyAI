const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/components/chat/movie-table.ts'),'utf8');
const exportsObject={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject});
const {movieTableRows}=exportsObject;
const sourceLink={title:'Verified source',url:'https://example.com/film'};
const movie={title:'Film',titleUz:null,titleRu:null,year:2014,sources:[sourceLink],posters:[]};
test('web and native share the verified table-row contract',()=>{
 const native=fs.readFileSync(path.join(__dirname,'../../clientNative/components/chat/movie-table.ts'),'utf8').replace('@/src/types/chat','@/types/chat');assert.equal(native,source);
});
test('missing or unsourced values do not appear in the table',()=>{
 const rows=movieTableRows({...movie,details:{budget:{value:'Invented amount',sources:[]},premiere:{value:null,sources:[sourceLink]},genres:{value:[],sources:[sourceLink]}}},'min.');
 assert.deepEqual(Array.from(rows,row=>row.key),['original','year']);
});
test('runtime appears once; writers, premiere and long single-line values retain their evidence',()=>{
 const directors='A very long director name '.repeat(20);const fact=value=>({value,sources:[sourceLink]});
 const rows=movieTableRows({...movie,details:{runtimeMinutes:fact(169),writers:fact(['Writer One','Writer Two']),premiere:fact('2014-10-26 (USA)'),directors:fact([directors]),imdb:fact(8.7)}},'daq.');
 assert.equal(rows.filter(row=>row.key==='runtime').length,1);assert.equal(rows.find(row=>row.key==='runtime').value,'169 daq.');
 assert.equal(rows.find(row=>row.key==='writers').value,'Writer One, Writer Two');assert.equal(rows.find(row=>row.key==='premiere').source,sourceLink.url);assert.ok(rows.find(row=>row.key==='directors').value.length>200);
});
test('table labels exist for Uzbek, Russian and English in both clients',()=>{
 for(const lang of ['uz','ru','en']){
  const web=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/i18n/locales/'+lang+'.json'),'utf8')).chat.movieTable;
  const native=JSON.parse(fs.readFileSync(path.join(__dirname,'../../clientNative/src/i18n/locales/'+lang+'.json'),'utf8')).chat.movieTable;
  assert.deepEqual(web,native);for(const key of ['original','uz','year','countries','genres','directors','writers','runtime','premiere','imdb','budget','ageRating'])assert.ok(web[key]);
 }
});
test('web renders semantic two-column rows inside its own scroll region and escapes source text',()=>{
 const componentSource=fs.readFileSync(path.join(__dirname,'../src/components/chat/MovieDetailsTable.tsx'),'utf8');
 const componentExports={};
 const colors={panel:'#070a12',panelSoft:'#0a0e18',text:'#fff',textMuted:'#888',borderSoft:'#223',accentBright:'#36f'};
 vm.runInNewContext(ts.transpileModule(componentSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:componentExports,require:name=>name.includes('theme-state')?{useTheme:()=>({colors})}:name.includes('useT')?{useT:()=>key=>key}:name==='./movie-table'?exportsObject:require(name),
 });
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const html=renderToStaticMarkup(React.createElement(componentExports.MovieDetailsTable,{movie:{...movie,title:'<script>unsafe</script>',details:{runtimeMinutes:{value:169,sources:[sourceLink]}}}}));
 assert.match(html,/<table/);assert.match(html,/<th scope="row"/);assert.match(html,/<td/);assert.match(html,/overflow-x-auto/);assert.match(html,/data-media-strip/);assert.match(html,/whitespace-nowrap/);
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/background-color:#0a0e18/);
});
