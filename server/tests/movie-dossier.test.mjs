import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dossierSchema,emptyDossier,verifiedDossier,renderMovieDossier} from '../dist/ai/services/movie-dossier.js';
function raw(){return Object.fromEntries(Object.keys(emptyDossier()).filter(key=>key!=='checkedAt').map(key=>[key,(key==='cast'||key==='characters')?[]:{value:null,sourceIndexes:[]}]))}
test('ratings require the correct official film page and an explicit matching score',()=>{
 const sources=[
  {title:'Film',url:'https://www.imdb.com/title/tt1234567/',snippet:'IMDb RATING 8.7/10'},
  {title:'Film',url:'https://www.kinopoisk.ru/film/12345/',snippet:'Рейтинг 8,6'},
  {title:'Film',url:'https://imdb.com.evil.example/title/tt1234567/',snippet:'Rating 8.7/10'},
  {title:'IMDb user',url:'https://www.imdb.com/user/12345/',snippet:'Rating 8.7/10'},
 ];
 const input=raw();input.imdb={value:8.7,sourceIndexes:[0]};input.kinopoisk={value:8.6,sourceIndexes:[1]};
 assert.equal(verifiedDossier(input,sources).imdb.value,8.7);assert.equal(verifiedDossier(input,sources).kinopoisk.value,8.6);
 for(const sourceIndexes of [[1],[2],[3],[99]]){input.imdb={value:8.7,sourceIndexes};assert.equal(verifiedDossier(input,sources).imdb.value,null);}
 input.imdb={value:8.8,sourceIndexes:[0]};assert.equal(verifiedDossier(input,sources).imdb.value,null);
});
test('unsourced facts and duplicate actors cannot become verified details',()=>{
 const input=raw();input.budget={value:'USD 999 million',sourceIndexes:[9]};
 input.cast=[{name:'Actor',role:'Hero',sourceIndexes:[0]},{name:'actor',role:'Hero',sourceIndexes:[0]},{name:'Unverified',role:null,sourceIndexes:[5]}];
 const details=verifiedDossier(input,[{title:'Credits',url:'https://example.com/credits'}]);assert.equal(details.budget.value,null);assert.equal(details.cast.length,1);
 assert.equal(dossierSchema.safeParse({...input,cast:Array(6).fill(input.cast[0])}).success,false);
});
test('missing fields remain visible in all languages with a confirmation question',()=>{
 const movie={title:'Example',titleUz:null,titleRu:null,year:2014,confidence:'medium',sources:[]};
 for(const language of ['uz','ru','en']){
  const answer=renderMovieDossier(movie,emptyDossier(),language);assert.match(answer,/IMDb/);assert.match(answer,/Kinopoisk/);assert.match(answer,/2014/);assert.ok(answer.length>500);
 }
 assert.match(renderMovieDossier(movie,emptyDossier(),'uz'),/Siz izlagan kino shumi\?/);
});
test('citation parentheses are encoded for safe Markdown links',()=>{
 const sources=[{title:'Wiki',url:'https://en.wikipedia.org/wiki/Example_(film)'}];const input=raw();input.genres={value:['Drama'],sourceIndexes:[0]};
 const answer=renderMovieDossier({title:'Example',titleUz:null,titleRu:null,year:2014,confidence:'high',sources},verifiedDossier(input,sources),'en');
 assert.match(answer,/Example_%28film%29/);
});
test('a release year alone cannot be used as a premiere date',()=>{
 const input=raw();input.premiere={value:'2014',sourceIndexes:[0]};input.writers={value:['Writer'],sourceIndexes:[0]};
 const sources=[{title:'Film credits',url:'https://example.com/film'}];
 const details=verifiedDossier(input,sources);assert.equal(details.premiere.value,null);assert.equal(details.writers.value[0],'Writer');
 input.premiere.value='2014-10-26 (USA)';assert.equal(verifiedDossier(input,sources).premiere.value,'2014-10-26 (USA)');
});
test('image narrative automatically contains sourced characters and omits inline citation links',()=>{
 const input=raw();input.characters=[{name:'Bell',originalName:'Belle',description:'Kitobsevar qahramon.',sourceIndexes:[0]}];input.synopsis={value:'Mazmun.',sourceIndexes:[0]};
 const sources=[{title:'Film',url:'https://example.com/film'}];const details=verifiedDossier(input,sources);
 const answer=renderMovieDossier({title:'Film',titleUz:null,titleRu:null,year:1991,confidence:'high',sources},details,'uz',true);
 assert.match(answer,/Asosiy qahramonlar/);assert.match(answer,/Bell \(Belle\)/);assert.doesNotMatch(answer,/\[\d+\]\(/);assert.equal(details.characters[0].sources.length,1);
});
test('explicit Kinopoisk ages are preferred and retain their country/system',()=>{
 for(const age of ['0+','6+','12+','16+','18+']){
  const input=raw();input.ageRating={value:'PG-13 (US)',sourceIndexes:[0]};input.kinopoisk={value:8.7,sourceIndexes:[1]};
  const details=verifiedDossier(input,[{title:'Film',url:'https://www.imdb.com/title/tt123/',snippet:'Rated PG-13'},{title:'Film',url:'https://www.kinopoisk.ru/film/123/',snippet:'Возраст: '+age}]);
  assert.equal(details.ageRating.value,age+' (RU)');assert.equal(details.ageRating.country,'RU');assert.equal(details.ageRating.system,'Kinopoisk');
 }
});
test('age cannot be invented, converted from MPAA, or resolved from conflicting classifications',()=>{
 const input=raw();input.ageRating={value:'12+ (RU)',sourceIndexes:[0]};const source={title:'Film rating',url:'https://www.kinopoisk.ru/film/123/',snippet:'IMDb 8.7/10'};
 assert.equal(verifiedDossier(input,[source]).ageRating.value,null);
 input.ageRating.value='G';assert.equal(verifiedDossier(input,[source]).ageRating.value,null);
 input.ageRating.value='PG-13 (US)';source.snippet='Rated PG-13';assert.equal(verifiedDossier(input,[source]).ageRating.value,'PG-13 (US)');
 source.snippet='Возраст: 12+ 16+';assert.equal(verifiedDossier(input,[source]).ageRating.value,null);
});
