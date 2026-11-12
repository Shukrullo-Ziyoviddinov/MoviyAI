import {test} from 'node:test';import assert from 'node:assert/strict';
import {imageDimensions,selectWorkingPosters,probeMoviePoster} from '../dist/ai/services/movie-poster-probe.js';
test('actual dimensions distinguish image headers from tiny or HTML responses',()=>{
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(500,16);png.writeUInt32BE(750,20);
 assert.deepEqual(imageDimensions(png),{width:500,height:750});assert.equal(imageDimensions(Buffer.from('<html>blocked</html>')),null);
 const jpeg=Buffer.from([255,216,255,192,0,11,8,2,238,1,244,1,1,17,0]);assert.deepEqual(imageDimensions(jpeg),{width:500,height:750});
 assert.equal(imageDimensions(jpeg.subarray(0,8)),null);
});
test('dead poster candidates are replaced in order, with at most two simultaneous probes',async()=>{
 const candidates=['bad','good1','throws','good2','unused'].map(name=>({url:'https://images.example/'+name}));let active=0,peak=0;const checked=[];
 const result=await selectWorkingPosters(candidates,AbortSignal.timeout(1000),async url=>{active++;peak=Math.max(peak,active);checked.push(url);await Promise.resolve();active--;if(url.endsWith('throws'))throw Error('timeout');return url.includes('good');});
 assert.deepEqual(result.map(item=>item.url.split('/').pop()),['good1','good2']);assert.equal(peak,2);assert.equal(checked.length,4);
});
test('poster probe rejects private URLs without opening a network request',async()=>{
 for(const url of ['http://example.com/poster.jpg','https://127.0.0.1/poster.jpg','https://10.0.0.1/poster.jpg'])assert.equal(await probeMoviePoster(url,AbortSignal.timeout(1000)),false);
});
