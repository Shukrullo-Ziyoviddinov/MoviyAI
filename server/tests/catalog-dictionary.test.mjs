import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogDictionaryEnricher} from '../dist/ai/catalog/services/catalog-dictionary.service.js';
import {resolveCatalogReferences,validateCatalogReferenceValues,findReferenceRows} from '../dist/ai/catalog/services/catalog-reference.service.js';
import {createCatalogChatProcessor} from '../dist/ai/catalog/services/catalog-chat-save.service.js';
import {prepareCatalogDraft} from '../dist/ai/catalog/mappers/movie.mapper.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
import {catalogFailureDetails} from '../dist/ai/catalog/utils/catalog-diagnostics.js';
import {catalogNameKeys} from '../dist/ai/catalog/utils/catalog-identity.js';
import {GENRE_ALIASES,COUNTRY_ALIASES} from '../dist/ai/catalog/config/catalog-reference.config.js';

const source={title:'Example (2014)',url:'https://example.com/film'};
function draft(genres=['Superqahramon'],countries=['USA']){
 const details=emptyDossier();details.genres={value:genres,sources:[source]};details.countries={value:countries,sources:[source]};
 return prepareCatalogDraft({title:'Example',titleUz:null,titleRu:null,year:2014,confidence:'high',sources:[source],details,posters:[]},{language:'uz'});
}
const proposal={verified:true,sameConcept:true,sourceTerm:'superhero',sourceIndexes:[0,1],existingGenreName:null,nameUz:'Superqahramon',nameRu:'Супергеройский',category:'actionMovies',countryCode:null};
const organic=[{title:'Example (2014) superhero film',link:'https://one.example/movie',snippet:'The genre is superhero.'},{title:'Example (2014) genres',link:'https://two.example/movie',snippet:'A superhero film.'}];
function harness({snapshot={genres:[{name:'Dramma',nameRu:'Драма'}],countries:[{name:'USA'}]},output=proposal,results=organic}={}){
 let state=structuredClone(snapshot),searches=0,models=0,writes=0;
 const repository={load:async()=>structuredClone(state),apply:async additions=>{writes++;for(const row of additions){
  const target=row.kind==='genre'?state.genres:state.countries;const existing=target.find(item=>item.name===row.name);
  if(existing)existing.catalogAliases=[...(existing.catalogAliases??[]),...row.aliases];
  else target.push({name:row.name,...(row.kind==='genre'?{nameRu:row.nameRu,catalogCategory:row.category}:{}),catalogAliases:row.aliases});
 }}};
 const ensure=createCatalogDictionaryEnricher({repository,searchWeb:async()=>{searches++;return {organic:results};},generate:async()=>{models++;return output;}});
 return {repository,ensure,counts:()=>({searches,models,writes}),state:()=>state};
}
test('verified missing genre is added once with canonical translations/category, then reused without AI or search',async()=>{
 const h=harness(),input=draft();const snapshot=await h.ensure(input,AbortSignal.timeout(1000));
 const resolved=resolveCatalogReferences(input,snapshot);assert.equal(resolved.ready,true);assert.deepEqual(resolved.draft.movie.genre,{uz:['Superqahramon'],ru:['Супергеройский']});assert.equal(resolved.draft.movie.categoryName,'actionMovies');
 assert.deepEqual(validateCatalogReferenceValues(resolved.draft.movie,snapshot),[]);
 await h.ensure(input,AbortSignal.timeout(1000));assert.deepEqual(h.counts(),{searches:1,models:1,writes:1});
});
test('synonym mapping reuses an existing genre and keeps its spelling instead of adding a duplicate',async()=>{
 const h=harness({output:{...proposal,existingGenreName:'Dramma',nameUz:null,nameRu:null,category:null}});
 const snapshot=await h.ensure(draft(),AbortSignal.timeout(1000));assert.equal(snapshot.genres.length,1);
 const resolved=resolveCatalogReferences(draft(),snapshot);assert.deepEqual(resolved.draft.movie.genre.uz,['Dramma']);
});
test('a known absent country is inserted from trusted reference without model-generated country names',async()=>{
 const h=harness({snapshot:{genres:[{name:'Dramma',nameRu:'Драма'}],countries:[]}});
 const snapshot=await h.ensure(draft(['Drama'],['Buyuk Britaniya']),AbortSignal.timeout(1000));
 assert.equal(snapshot.countries[0].name,'United Kingdom');assert.equal(resolveCatalogReferences(draft(['Drama'],['Великобритания']),snapshot).ready,true);assert.deepEqual(h.counts(),{searches:0,models:0,writes:1});
});
test('unverified, single-site, unrelated-movie and invented-country proposals never write dictionaries',async()=>{
 for(const options of [{output:{...proposal,verified:false}},{results:[organic[0]]},{results:organic.map(row=>({...row,title:'Another Movie',snippet:'A superhero genre.'}))}]){
  const h=harness(options);await h.ensure(draft(),AbortSignal.timeout(1000));assert.equal(h.counts().writes,0);
 }
 const h=harness({output:{...proposal,countryCode:'Atlantis'}});await h.ensure(draft(['Drama'],['Atlantis']),AbortSignal.timeout(1000));assert.equal(h.counts().writes,0);
 const wrongCountry=harness({output:{...proposal,countryCode:'US'}});await wrongCountry.ensure(draft(['Drama'],['Atlantis']),AbortSignal.timeout(1000));assert.equal(wrongCountry.counts().writes,0);
});
test('ambiguous existing values and unverified input facts do not trigger automatic additions',async()=>{
 const h=harness({snapshot:{genres:[{name:'Dramma',nameRu:'Драма'},{name:'Drama',nameRu:'Драма'}],countries:[{name:'USA'}]}});
 await h.ensure(draft(['Драма']),AbortSignal.timeout(1000));assert.equal(h.counts().models,0);
 const input=draft();input.research.details.genres.sources=[];await h.ensure(input,AbortSignal.timeout(1000));assert.equal(h.counts().writes,0);
});
test('chat processor fills missing dictionaries before enrichment and saving',async()=>{
 const h=harness();let saved=false,enriched=false;
 const process=createCatalogChatProcessor({matcher:{movie:async()=>({status:'not-found',method:'checked-candidates'})},references:h.repository.load,ensureReferences:h.ensure,
  enrich:async input=>{enriched=true;return input;},links:async input=>input,save:async input=>{assert.equal(input.movie.categoryName,'actionMovies');saved=true;return {status:'created',movieId:8002};}});
 const input=draft();const result=await process({movie:input.research,language:'uz',actorImages:[]},null,AbortSignal.timeout(1000),async()=>{});
 assert.equal(result.status,'created');assert.equal(saved,true);assert.equal(enriched,true);
});
test('repository rechecks aliases inside a shared transaction so simultaneous additions create only one row',async()=>{
 const sourceCode=readFileSync(new URL('../dist/ai/catalog/repositories/catalog-dictionary.repository.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/\bexport /g,'');
 const state={genres:[],countries:[]};let gate=Promise.resolve();
 const model=key=>({createIndexes:async()=>{},create:async rows=>{state[key].push(...structuredClone(rows));},updateOne:async(filter,update)=>{
  const row=state[key].find(row=>row.name===filter.name);for(const [field,operation]of Object.entries(update.$addToSet))row[field]=[...new Set([...(row[field]??[]),...operation.$each])];
 }});
 const transaction=async work=>{const previous=gate;let release;gate=new Promise(resolve=>{release=resolve;});await previous;try{return await work({});}finally{release();}};
 const repo=new Function('Genre','Country','withCatalogTransaction','createCatalogReferenceRepository','catalogReferenceRepository','findReferenceRows','GENRE_ALIASES','COUNTRY_ALIASES','catalogNameKeys',sourceCode+'\nreturn catalogDictionaryRepository;')
 (model('genres'),model('countries'),transaction,()=>({load:async()=>structuredClone(state)}),{load:async()=>structuredClone(state)},findReferenceRows,GENRE_ALIASES,COUNTRY_ALIASES,catalogNameKeys);
 const addition={kind:'genre',input:'superhero',name:'Superqahramon',nameRu:'Супергеройский',aliases:['superhero','superqahramon'],category:'actionMovies',sources:[]};
 await Promise.all([repo.apply([addition]),repo.apply([addition])]);assert.equal(state.genres.length,1);assert.equal(state.genres[0].catalogCategory,'actionMovies');
 await repo.apply([{kind:'country',input:'Buyuk Britaniya',name:'United Kingdom',aliases:['UK','GB'],sources:[]}]);
 await repo.apply([{kind:'country',input:'UK',name:'United Kingdom',aliases:['Buyuk Britaniya'],sources:[]}]);assert.equal(state.countries.length,1);
});
