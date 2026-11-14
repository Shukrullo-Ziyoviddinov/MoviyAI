import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasMediaIdentityEvidence} from '../dist/ai/utils/media-identity.js';

const sources=[{title:'Hi-Five (2025)',snippet:'Five organ recipients develop supernatural abilities. A shared donor links their powers.'}];
const evidence=[
 {kind:'scene',observation:'Several organ recipients demonstrate powers',sourceIndex:0,sourceQuote:'Five organ recipients develop supernatural abilities'},
 {kind:'dialogue',observation:'The characters discuss a shared donor',sourceIndex:0,sourceQuote:'A shared donor links their powers'},
];
const match={confidence:'high',sourceIndexes:[0],visualEvidence:evidence,contradictions:[]};
test('video needs distinct source-supported scene observations, not a guessed title or actor',()=>{
 assert.equal(hasMediaIdentityEvidence(match,sources,true),true);
 assert.equal(hasMediaIdentityEvidence({...match,visualEvidence:[]},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,visualEvidence:[evidence[0]]},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,visualEvidence:evidence.map(item=>({...item,kind:'actor'}))},sources,true),false);
});
test('invented quotes, repeated observations, contradictions and medium confidence fail closed',()=>{
 assert.equal(hasMediaIdentityEvidence({...match,visualEvidence:[evidence[0],evidence[0]]},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,visualEvidence:evidence.map(item=>({...item,sourceQuote:'A psychic policeman solves criminal cases'}))},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,contradictions:['The footage is a film, the search result is a different TV series']},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,confidence:'medium'},sources,true),false);
 assert.equal(hasMediaIdentityEvidence({...match,sourceIndexes:[1]},sources,true),false);
});
