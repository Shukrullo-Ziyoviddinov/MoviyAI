import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifiedActorCredit,actorProfileKey} from '../dist/ai/catalog/utils/catalog-actor-identity.js';
import {matchActorCandidates,actorIdentityForInsert} from '../dist/ai/catalog/services/catalog-match.service.js';
import {createCatalogEnricher} from '../dist/ai/catalog/services/catalog-enrichment.service.js';
import {prepareCatalogDraft} from '../dist/ai/catalog/mappers/movie.mapper.js';
import {emptyDossier} from '../dist/ai/services/movie-dossier.js';
const sources=[
 {title:'Aziz Karimov - Biography',url:'https://actors.example/aziz-karimov',snippet:'Aziz Karimov Sokin tong (2020) filmida Akmal rolida.'},
 {title:'Sokin tong (2020) film credits',url:'https://studio.example/sokin-tong',snippet:'Aziz Karimov — Akmal.'},
];
const input={name:'Aziz Karimov',originalName:'Aziz Karimov',imdbId:null,kinopoiskId:null,birthDate:null,sources,profile:sources[0],credit:{filmTitle:'Sokin tong',year:2020,role:'Akmal',sources}};
test('a public profile plus two sourced exact film roles can establish an actor without IMDb or birth date',()=>{
 assert.equal(verifiedActorCredit(input),true);assert.equal(matchActorCandidates(input,[]).status,'not-found');
 const identity=actorIdentityForInsert(input);assert.ok(identity.profileKey);assert.equal(identity.imdbId,undefined);assert.equal(identity.birthDate,undefined);
 const stored={id:9001,actorName:input.name,catalogIdentity:identity};
 assert.deepEqual(matchActorCandidates(input,[stored]),{status:'existing',id:9001,method:'verified-profile'});
});
test('a name alone, wrong role or one repeated site is insufficient to establish the public identity',()=>{
 for(const credit of [undefined,{...input.credit,role:'Another role'},{...input.credit,sources:[sources[0],sources[0]]}]){
  const candidate={...input,credit};assert.equal(actorProfileKey(candidate),null);assert.equal(matchActorCandidates(candidate,[]).status,'needs-research');
 }
});
test('a unique legacy actor can be reused by matching the same named film role; namesakes stay unresolved',()=>{
 const stored={id:9001,actorName:input.name,actorAbout:{uz:'Aziz Karimov Sokin tong (2020) filmida Akmal rolini ijro etgan.'}};
 assert.deepEqual(matchActorCandidates(input,[stored]),{status:'existing',id:9001,method:'name-film-role'});
 assert.equal(matchActorCandidates(input,[{...stored,actorAbout:{uz:'Another movie and another role'}}]).status,'needs-research');
 assert.equal(matchActorCandidates(input,[{...stored,actorAbout:{uz:'Sokin tong (2010) filmida Akmal.'}}]).status,'needs-research');
 assert.equal(matchActorCandidates(input,[stored,{...stored,id:9002}]).status,'needs-research');
});
test('profile evidence does not override a conflicting stored identity or full birth date',()=>{
 const identity=actorIdentityForInsert(input);
 const candidate={...input,birthDate:{value:'1980-01-01',sources:[sources[0]]}};
 assert.equal(matchActorCandidates(candidate,[{id:9001,actorName:input.name,catalogIdentity:{...identity,birthDate:'1981-01-01'}}]).status,'conflict');
});
test('actual enrichment accepts sourced non-IMDb biography/role evidence and retains portrait candidates',async()=>{
 const fact=value=>({value,sources:[sources[1]]});const details=emptyDossier();
 Object.assign(details,{genres:fact(['Drama']),countries:fact(['USA']),runtimeMinutes:fact(100),ageRating:fact('12+'),synopsis:fact('Plot'),directors:fact(['Director']),imdb:fact(7),kinopoisk:fact(7),cast:[{name:input.name,originalName:input.name,role:'Akmal',sources:[sources[1]]}]});
 const movie={title:'Sokin tong',titleUz:'Sokin tong',titleRu:'Sokin tong RU',year:2020,confidence:'high',sources:[sources[1]],posters:[{url:'https://images.example/poster.jpg',sourceUrl:null}],details};
 const draft=prepareCatalogDraft(movie,{language:'uz',localized:{ru:{synopsis:fact('Plot RU'),country:fact('USA'),director:fact('Director')}}});
 const chat={movie,language:'uz',actorImages:[{label:input.name,imageUrl:'https://images.example/actor.jpg',sourceUrl:sources[0].url}]};
 const enrich=createCatalogEnricher({matcher:{actor:async value=>matchActorCandidates(value,[])},searchWeb:async()=>({organic:sources.map(source=>({title:source.title,link:source.url,snippet:source.snippet}))}),searchImages:async()=>({images:[]}),
  generate:async()=>({samePerson:true,sameRole:true,personIndex:0,creditSourceIndexes:[0,1],creditedRole:{value:'Akmal',sourceIndexes:[0,1]},biographyUz:{value:'Sourced UZ biography',sourceIndexes:[0]},biographyRu:{value:'Sourced RU biography',sourceIndexes:[0]},birthDate:{value:null,sourceIndexes:[]}}),
 });
 const result=await enrich(draft,chat,AbortSignal.timeout(1000),async()=>{});const actor=result.actors[0];
 assert.equal(actor.identity.imdbId,null);assert.equal(actor.identity.birthDate,null);assert.ok(actor.actorAbout.uz);assert.ok(actor.credit);assert.ok(actor.profile);assert.equal(actor.imageCandidates.length,1);
});
