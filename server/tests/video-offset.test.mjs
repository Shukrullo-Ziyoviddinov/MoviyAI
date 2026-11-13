import {test} from 'node:test';import assert from 'node:assert/strict';
import {videoEndOffset} from '../dist/ai/utils/video-offset.js';
test('real MP4 floating durations become valid protobuf offsets with no more than nine fractional digits',()=>{
 const cases=[[42.63111111111111,'42.631111111s'],[24.055555555555557,'24.055555555s'],[60.116,'60.116s'],[180,'180s'],[120,'120s'],[0.000001,'0.000001s']];
 for(const [seconds,expected] of cases){const formatted=videoEndOffset(seconds);assert.equal(formatted,expected);assert.match(formatted,/^\d+(?:\.\d{1,9})?s$/);assert.ok(parseFloat(formatted)<=seconds);}
 for(const seconds of [0,-1,Infinity,NaN,181,0.0000000001])assert.throws(()=>videoEndOffset(seconds),/INVALID_VIDEO_DURATION/);
});
