const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
function group(file){const module={exports:{}};const compiled=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('module','exports','require',compiled)(module,module.exports,()=>({displayMovieTitle:()=>'',translate:(_lang,key)=>key}));return module.exports.groupMoviesByCategory;}
test('web and native show uncategorized saved films once instead of silently hiding them',()=>{
 for(const file of ['../src/data/homeMovies.ts','../../clientNative/src/utils/groupMovies.ts']){
  const groupMovies=group(file),movies=[{id:1,categoryName:'animationMovies'},{id:2,categoryName:null},{id:3,categoryName:'unknown-section'}];
  const groups=groupMovies(movies);assert.deepEqual(groups.find(item=>item.categoryName==='otherMovies').movies.map(item=>item.id),[2,3]);
  assert.equal(groups.flatMap(item=>item.movies).length,3);assert.equal(movies[1].categoryName,null);
  assert.equal(groupMovies([movies[0]]).some(item=>item.categoryName==='otherMovies'),false);
 }
});
