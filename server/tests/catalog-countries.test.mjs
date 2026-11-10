import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTRY_REFERENCE_ALIASES} from '../dist/ai/catalog/config/country-reference.generated.js';
import {resolveCatalogReferences} from '../dist/ai/catalog/services/catalog-reference.service.js';
import {prepareCatalogDraft} from '../dist/ai/catalog/mappers/movie.mapper.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
const countries=JSON.parse(readFileSync(new URL('../data/country.json',import.meta.url),'utf8'));
const source={title:'Production evidence',url:'https://example.com/movie'};
function resolve(country){
 const details=emptyDossier();details.genres={value:['Drama'],sources:[source]};details.countries={value:[country],sources:[source]};
 const draft=prepareCatalogDraft({title:'Example',titleUz:null,titleRu:null,year:2014,confidence:'high',sources:[source],posters:[],details},{language:'uz'});
 return resolveCatalogReferences(draft,{genres:[{name:'Dramma',nameRu:'Драма'}],countries});
}
test('all 255 country/territory/historical rows resolve to unique existing dictionary names',()=>{
 assert.equal(countries.length,255);assert.equal(new Set(countries.map(row=>row.name)).size,255);
 for(const {name} of countries){const result=resolve(name);assert.equal(result.ready,true,name);assert.equal(result.draft.movie.filterCountry,name);}
});
test('generated multilingual country aliases resolve without creating translated output labels',()=>{
 for(const aliases of Object.values(COUNTRY_REFERENCE_ALIASES))for(const alias of aliases){
  const result=resolve(alias);assert.equal(result.ready,true,alias);assert.equal(result.draft.movie.filterCountry,aliases[0]);
 }
 for(const alias of ['Buyuk Britaniya','Великобритания','GBR'])assert.equal(resolve(alias).draft.movie.filterCountry,'United Kingdom');
});
test('ambiguous and historical countries cannot silently become different modern countries',()=>{
 for(const name of ['Korea','Congo','Kongo','Unknown country'])assert.equal(resolve(name).ready,false,name);
 assert.equal(resolve('СССР').draft.movie.filterCountry,'Soviet Union');
 assert.equal(resolve('Russia').draft.movie.filterCountry,'Russia');
 assert.equal(resolve('GDR').draft.movie.filterCountry,'East Germany');
});
