const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
function load(file,resolver=require){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)(resolver,module,module.exports);return module.exports;}
const display=load('src/utils/movieDisplay.ts').displayMovieTitle;
test('web and native display original names while missing localized DB fields remain null',()=>{
 for(const file of ['src/utils/movieDisplay.ts','../clientNative/src/utils/movieDisplay.ts']){
  const title=load(file).displayMovieTitle;const movie={title:{uz:null,ru:null},catalogIdentity:{originalTitle:'Original film'}};
  assert.equal(title(movie,'uz'),'Original film');assert.equal(title({...movie,title:{uz:'UZ name',ru:null}},'uz'),'UZ name');assert.equal(movie.title.uz,null);
 }
});
test('home card with a null poster and rating renders a stable title and no fabricated zero score',()=>{
 const resolver=name=>{
  if(name==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(name==='@/api/wishlist')return {moviePosterUrl:value=>value??''};
  if(name==='@/components/icons')return {BookmarkIcon:()=>React.createElement('svg')};
  if(name==='@/components/theme/theme-state')return {useTheme:()=>({colors:{panelSoft:'#111',text:'#fff'},isDark:true})};
  if(name==='@/data/homeMovies')return {movieTitle:display};
  if(name==='@/utils/movieDisplay')return load('src/utils/movieDisplay.ts');
  return require(name);
 };
 const {MovieCard}=load('src/components/home/MovieCard.tsx',resolver);
 const movie={id:1,title:{uz:null,ru:null},catalogIdentity:{originalTitle:'Original film'},homeImgPoster:null,ratingImdb:null,categoryName:null};
 const html=renderToStaticMarkup(React.createElement(MovieCard,{movie,language:'uz',saved:false,onToggleSave:()=>{}}));
 assert.match(html,/Original film/);assert.doesNotMatch(html,/0\.0|<img/);
 const rated=renderToStaticMarkup(React.createElement(MovieCard,{movie:{...movie,ratingImdb:8.4},language:'uz',saved:false,onToggleSave:()=>{}}));assert.match(rated,/8\.4/);
 const fallback=renderToStaticMarkup(React.createElement(MovieCard,{movie:{...movie,ratingKinopoisk:7.4},language:'uz',saved:false,onToggleSave:()=>{}}));assert.match(fallback,/Kinopoisk/);assert.match(fallback,/7\.4/);
});

test('web and native ratings prefer IMDb, fall back to Kinopoisk and retain a real zero',()=>{
 for(const file of ['src/utils/movieDisplay.ts','../clientNative/src/utils/movieDisplay.ts']){
  const rating=load(file).displayMovieRating;
  assert.equal(rating({ratingImdb:null,ratingKinopoisk:7.4}).value,7.4);
  assert.equal(rating({ratingImdb:8,ratingKinopoisk:7.4}).label,'IMDb');
  assert.equal(rating({ratingImdb:0,ratingKinopoisk:7.4}).value,0);
  assert.equal(rating({ratingImdb:null,ratingKinopoisk:null}).value,null);
 }
});
