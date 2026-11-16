import {test} from 'node:test';
import assert from 'node:assert/strict';
import {videoRangeReader} from '../dist/ai/utils/video-range-reader.js';
import {videoDuration} from '../dist/ai/utils/video-metadata.js';
const atom=(type,body)=>{const header=Buffer.alloc(8);header.writeUInt32BE(body.length+8);header.write(type,4);return Buffer.concat([header,body]);};

test('container verification stays within a slow-network request budget instead of one request per atom',async()=>{
 const mvhd=Buffer.alloc(24);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(68000,16);
 const file=Buffer.concat([atom('ftyp',Buffer.from('isom0000')),...Array.from({length:30},()=>atom('free',Buffer.alloc(8))),atom('mdat',Buffer.alloc(1_000_000)),atom('moov',atom('mvhd',mvhd))]);
 const reader=()=>{let calls=0,bytes=0;return {read:async(offset,length)=>{if(++calls>3)throw Object.assign(Error('Network deadline'),{name:'TimeoutError'});bytes+=length;return file.subarray(offset,offset+length);},stats:()=>({calls,bytes})};};
 const old=reader();await assert.rejects(()=>videoDuration(file.length,'video/mp4',old.read),{name:'TimeoutError'});
 const fixed=reader();assert.equal(await videoDuration(file.length,'video/mp4',videoRangeReader(file.length,fixed.read)),68);
 assert.equal(fixed.stats().calls,2);assert.ok(fixed.stats().bytes<=8192);
});
test('cross-block reads preserve exact bytes, reuse blocks and enforce a 128 KiB ceiling',async()=>{
 let calls=0;const file=Buffer.alloc(200_000);for(let i=0;i<file.length;i++)file[i]=i%251;
 const read=videoRangeReader(file.length,async(o,n)=>{calls++;return file.subarray(o,o+n);});
 assert.deepEqual(await read(4090,24),file.subarray(4090,4114));assert.equal(calls,2);
 await read(4091,12);assert.equal(calls,2);
 await read(0,65536);await read(65536,65536);
 await assert.rejects(()=>read(131072,1),/VIDEO_METADATA_LIMIT/);
 await assert.rejects(()=>read(-1,4),/INVALID_VIDEO_RANGE/);
 await assert.rejects(()=>read(199999,2),/INVALID_VIDEO_RANGE/);
});
test('truncated range responses fail instead of looping or returning incomplete metadata',async()=>{
 await assert.rejects(()=>videoRangeReader(100,async()=>Buffer.alloc(0))(0,16),/INVALID_VIDEO_RANGE/);
});
