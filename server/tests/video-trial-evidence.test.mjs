import {test} from 'node:test';
import assert from 'node:assert/strict';
import {supportedTrialMatch} from '../scripts/lib/video-trial-evidence.mjs';
const observations={moments:[{seconds:8,action:'Heals a wheelchair user'}]};
const sources=[{snippet:'Organ recipients develop powers and heal a wheelchair user in a crowded hall.'}];
const evidence={momentIndex:0,sourceIndex:0,quote:sources[0].snippet,distinctive:true,explanation:'Observed healing action matches this scene.'};
const result={matched:true,title:'Candidate',year:2025,contradictions:[],evidence:[evidence]};
test('accepts a quoted scene connection but rejects name-only, invented or contradictory support',()=>{
 assert.equal(supportedTrialMatch(result,observations,sources).title,'Candidate');
 for(const patch of [{evidence:[]},{contradictions:['Different setting']},{evidence:[{...evidence,quote:'Invented scene quote not present in the supplied web search.'}]},{evidence:[{...evidence,sourceIndex:4}]},{evidence:[{...evidence,momentIndex:5}]},{evidence:[{...evidence,distinctive:false}]}])assert.equal(supportedTrialMatch({...result,...patch},observations,sources),null);
});
