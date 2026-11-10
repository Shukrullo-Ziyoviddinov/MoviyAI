import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actorProfileMatches,actorCreditMatches,actorIdentitySources} from '../dist/ai/catalog/utils/catalog-actor-evidence.js';
test('official actor profile needs the expected name in its heading, not a namesake mention in its snippet',()=>{
 assert.equal(actorProfileMatches({title:'Emma Watson (II)',url:'https://www.imdb.com/name/nm0914612/',snippet:'Actress'},['Emma Watson']),true);
 assert.equal(actorProfileMatches({title:'Emily Watson - Biography',url:'https://www.imdb.com/name/nm0001833/bio/',snippet:'Often mistaken for Emma Watson'},['Emma Watson']),false);
 assert.equal(actorProfileMatches({title:'Emma Watson',url:'https://www.imdb.com/title/tt1201607/'},['Emma Watson']),false);
});
test('credit evidence recognizes punctuation and explicit part numerals while rejecting other parts/versions',()=>{
 const title='Harry Potter and the Deathly Hallows: Part 2';
 const source={title:'Harry Potter and the Deathly Hallows – Part II (2011)',url:'https://example.com/film',snippet:'With Emma Watson as Hermione Granger.'};
 assert.equal(actorCreditMatches(source,['Emma Watson'],[title],2011),true);
 assert.equal(actorCreditMatches({...source,title:source.title.replace('Part II','Part 1')},['Emma Watson'],[title],2011),false);
 assert.equal(actorCreditMatches({...source,title:source.title.replace('2011','2026')},['Emma Watson'],[title],2011),false);
 assert.equal(actorCreditMatches({...source,snippet:'Emily Watson is an actor.'},['Emma Watson'],[title],2011),false);
});
test('unrelated actor page citations cannot introduce conflicting person IDs',()=>{
 const profile={title:'Emma Watson',url:'https://www.imdb.com/name/nm0914612/'};
 const wrong={title:'Emily Watson',url:'https://www.imdb.com/name/nm0001833/'};
 const credit={title:'Film credits',url:'https://www.imdb.com/title/tt1201607/'};
 assert.deepEqual(actorIdentitySources([profile,wrong,credit],profile),[profile,credit]);
});
