const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function harness({sizes=[10_000_000],duration=32,fail=false}={}){
 const files=new Map([['file://input.mp4',{size:21_000_000,duration}]]);const calls=[];const deleted=[];
 class File{constructor(uri){this.uri=uri;}get exists(){return files.has(this.uri);}get size(){return files.get(this.uri)?.size??0;}get modificationTime(){return 1;}delete(){deleted.push(this.uri);files.delete(this.uri);}}
 const compressor={getVideoMetaData:async uri=>({duration:files.get(uri).duration,width:1920,height:1080}),Video:{compress:async(uri,options)=>{calls.push(options);if(fail)throw Error('codec');const path='file://compressed'+calls.length+'.mp4';files.set(path,{size:sizes[calls.length-1]??20_000_000,duration});return path;},cancelCompression(){}}};
 const code=ts.transpileModule(fs.readFileSync('src/media/prepare-chat-video.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','exports','module',code)(name=>name==='expo-file-system'?{File}:compressor,module.exports,module);
 return {prepare:module.exports.prepareChatVideo,File,files,calls,deleted};
}
test('small videos remain original; large videos are encoded and reused on retry',async()=>{
 const h=harness();h.files.set('file://small.mp4',{size:3_000_000});const small=new h.File('file://small.mp4');assert.equal(await h.prepare(small),small);
 const input=new h.File('file://input.mp4');const output=await h.prepare(input);assert.equal(output.size,10_000_000);assert.equal(await h.prepare(input),output);assert.equal(h.calls.length,1);const edge=h.calls[0].maxSize;assert.ok(edge<=720);assert.equal(edge%2,0);assert.equal(Math.trunc(Math.fround(Math.fround(edge/1920)*1080))%2,0);assert.equal(h.calls[0].minimumFileSizeForCompress,0);
});
test('oversized first output is deleted and retried at lower bitrate',async()=>{
 const h=harness({sizes:[16_000_000,9_000_000]});const output=await h.prepare(new h.File('file://input.mp4'));assert.equal(output.size,9_000_000);assert.equal(h.calls.length,2);assert.ok(h.calls[1].bitrate<h.calls[0].bitrate);assert.deepEqual(h.deleted,['file://compressed1.mp4']);
});
test('encoder failure and oversized inputs stop before upload with a clear error code',async()=>{
 const h=harness({fail:true});await assert.rejects(h.prepare(new h.File('file://input.mp4')),e=>e.failureCode==='compression_failed');
 h.files.set('file://huge.mp4',{size:90*1024*1024});await assert.rejects(h.prepare(new h.File('file://huge.mp4')),e=>e.failureCode==='video_too_large');
});
test('long clips are not trimmed and output above the limit is never returned',async()=>{
 const h=harness({duration:181});await assert.rejects(h.prepare(new h.File('file://input.mp4')),e=>e.failureCode==='video_unreadable');assert.equal(h.calls.length,0);
 const big=harness({sizes:[20_000_000,19_000_000]});await assert.rejects(big.prepare(new big.File('file://input.mp4')),e=>e.failureCode==='video_too_large');assert.equal(big.deleted.length,2);
});

test('an OS-evicted retry file is recreated rather than uploading a missing file',async()=>{
 const h=harness({sizes:[9_000_000,8_000_000]});const input=new h.File('file://input.mp4');const first=await h.prepare(input);first.delete();const second=await h.prepare(input);assert.equal(second.size,8_000_000);assert.equal(h.calls.length,2);
});

test('native compression messages are present in all languages and refer to the app',()=>{
 for(const language of ['uz','ru','en']){
  const labels=JSON.parse(fs.readFileSync('src/i18n/locales/'+language+'.json','utf8')).chat;
  assert.ok(labels.progress.preparing_video);
  for(const code of ['compression_unsupported','compression_failed','video_too_large'])assert.ok(labels.failures[code]);
  assert.doesNotMatch(labels.failures.compression_unsupported,/browser|brauzer|браузер|Chrome|Edge/i);
 }
});
