import {test} from 'node:test';
import assert from 'node:assert/strict';
import {videoDuration} from '../dist/ai/utils/video-metadata.js';
import {findMovieFromVideo} from '../dist/ai/services/video-movie.service.js';
const atom=(type,body)=>{const h=Buffer.alloc(8);h.writeUInt32BE(body.length+8);h.write(type,4);return Buffer.concat([h,body]);};
test('video inference rejects invalid durations before making any provider request',()=>{
 for(const durationSeconds of [-1,0,181,NaN,Infinity])assert.throws(()=>findMovieFromVideo('Find',[{fileUri:'https://r2.example/v',mimeType:'video/mp4',durationSeconds}]),/INVALID_CHAT_VIDEO/);
});
test('MP4 duration reads metadata while skipping the large media atom',async()=>{
 const mvhd=Buffer.alloc(24);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(180000,16);
 const file=Buffer.concat([atom('ftyp',Buffer.from('isom0000')),atom('mdat',Buffer.alloc(100000)),atom('moov',atom('mvhd',mvhd))]);
 let bytes=0;const duration=await videoDuration(file.length,'video/mp4',async(offset,length)=>{bytes+=length;return file.subarray(offset,offset+length);});
 assert.equal(duration,180);assert.ok(bytes<120);
});
test('MOV version-one duration and malformed/unbounded container metadata are validated',async()=>{
 const mvhd=Buffer.alloc(36);mvhd[0]=1;mvhd.writeUInt32BE(1000,20);mvhd.writeBigUInt64BE(181000n,24);
 const file=Buffer.concat([atom('ftyp',Buffer.from('qt  0000')),atom('moov',atom('mvhd',mvhd))]);
 assert.equal(await videoDuration(file.length,'video/quicktime',async(o,n)=>file.subarray(o,o+n)),181);
 await assert.rejects(()=>videoDuration(100,'video/mp4',async()=>Buffer.alloc(16)),/SIGNATURE/);
});
test('WebM reads EBML segment duration/timecode scale without reading media clusters',async()=>{
 const element=(id,data)=>Buffer.concat([Buffer.from(id),Buffer.from([0x80|data.length]),data]);
 const ticks=Buffer.alloc(8);ticks.writeDoubleBE(4000);
 const info=element([0x15,0x49,0xa9,0x66],Buffer.concat([element([0x2a,0xd7,0xb1],Buffer.from([0x0f,0x42,0x40])),element([0x44,0x89],ticks)]));
 const file=Buffer.concat([element([0x1a,0x45,0xdf,0xa3],Buffer.alloc(0)),element([0x18,0x53,0x80,0x67],info)]);
 assert.equal(await videoDuration(file.length,'video/webm',async(o,n)=>file.subarray(o,o+n)),4);
});
