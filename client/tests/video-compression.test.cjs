const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('node:vm'),ts=require('typescript');
function load(name,dependencies={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/media/'+name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(dependencies[name])return dependencies[name];throw Error('Unexpected module: '+name);},Blob,WeakMap,Promise,setTimeout,clearTimeout,...globals});return exports;}
const plan=load('video-compression-plan');

test('large conversion budgets AAC in bits per second using the installed Quality API',async()=>{
 const bunny=await import('mediabunny');
 const video={displayWidth:1920,displayHeight:1080},audio={};
 class Input{async getPrimaryVideoTrack(){return video;}async getPrimaryAudioTrack(){return audio;}async computeDuration(){return 60;}dispose(){}}
 class Target{on(){return ()=>{};}}
 class Output{constructor({target}){this.target=target;}}
 const fake={...bunny,Input,BlobSource:class{},BufferTarget:Target,Output,Mp4OutputFormat:class{},canEncodeAudio:async()=>true,
  Conversion:{init:async args=>({isValid:true,utilizedTracks:[video,audio],state:'pending',cancel:async()=>{},execute:async function(){
   assert.equal(args.audio.quality._toAudioBitrate('aac'),64000);
   args.output.target.buffer=new Uint8Array(100).buffer;this.state='done';
  }})}};
 const {prepareChatVideo}=load('prepare-chat-video',{'./video-compression-plan':plan,mediabunny:fake},{VideoEncoder:function(){},VideoDecoder:function(){}});
 const result=await prepareChatVideo(new Blob([new Uint8Array(20_000_000)],{type:'video/mp4'}));
 assert.equal(result.type,'video/mp4');assert.ok(result.size<=plan.AI_VIDEO_MAX_BYTES);
});
test('compression plan preserves aspect ratio within even encoder dimensions and budgets for audio',()=>{
 for(const duration of [31.724333333333334,60,180])for(const [width,height] of [[1920,1080],[1080,1920],[720,544]]){
  const first=plan.videoCompressionPlan(duration,width,height);assert.ok(first.width<=720&&first.height<=720);assert.equal(first.width%2,0);assert.equal(first.height%2,0);assert.ok(Math.abs(first.width/first.height-width/height)<0.01);assert.ok((first.videoBitrate+first.audioBitrate)*duration/8<plan.AI_VIDEO_MAX_BYTES);
  const fallback=plan.videoCompressionPlan(duration,width,height,1);assert.ok(fallback.width<=480&&fallback.height<=480);assert.ok(fallback.videoBitrate<first.videoBitrate);
 }
 for(const duration of [0,-1,181,NaN,Infinity])assert.throws(()=>plan.videoCompressionPlan(duration,1920,1080));
});
test('small files pass unchanged without loading an encoder; unsupported large files fail before any upload',async()=>{
 const {prepareChatVideo}=load('prepare-chat-video',{'./video-compression-plan':plan});const small=new Blob([new Uint8Array(100)],{type:'video/mp4'});assert.equal(await prepareChatVideo(small),small);
 await assert.rejects(()=>prepareChatVideo(new Blob()),error=>error.failureCode==='video_too_large');
 const large=new Blob([new Uint8Array(plan.AI_VIDEO_MAX_BYTES+1)],{type:'video/mp4'});await assert.rejects(()=>prepareChatVideo(large),error=>error.failureCode==='compression_unsupported');
 await assert.rejects(()=>prepareChatVideo(large),error=>error.failureCode==='compression_unsupported');
});
test('an unavailable encoder download is a preparation failure, not an unsupported-browser claim',async()=>{
 const {prepareChatVideo}=load('prepare-chat-video',{'./video-compression-plan':plan},{VideoEncoder:function(){},VideoDecoder:function(){}});
 const large=new Blob([new Uint8Array(plan.AI_VIDEO_MAX_BYTES+1)],{type:'video/mp4'});
 await assert.rejects(()=>prepareChatVideo(large),error=>error.failureCode==='compression_failed');
});
test('all three preparation problems have localized chat messages and prevent upload reservation',async()=>{
 const {webcrypto}=require('node:crypto');const source=fs.readFileSync(path.join(__dirname,'../src/api/chat.ts'),'utf8');
 for(const code of ['compression_unsupported','compression_failed','video_too_large']){
  for(const language of ['uz','ru','en']){const labels=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/i18n/locales/'+language+'.json'),'utf8'));assert.ok(labels.chat.failures[code]?.trim());}
  const exports={},stages=[];let networkCalls=0;
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Blob,crypto:webcrypto,AbortSignal,require:name=>name.includes('prepare-chat-video')?{prepareChatVideo:async()=>{throw Object.assign(Error('Technical detail'),{failureCode:code});}}:name.includes('chat-stream')?{}:{apiBaseUrl:'https://api.example',readAuthToken:()=> 'token'},fetch:async()=>{networkCalls++;throw Error('Must not upload');}});
  await assert.rejects(()=>exports.sendChat('chat','request','Find',()=>{},[{id:'v',type:'video',file:new Blob(['video'])}],stage=>stages.push(stage)),error=>error.failureCode===code);
  assert.equal(networkCalls,0);assert.deepEqual(stages,['preparing_video']);
 }
});
test('web uploader reserves the compressed byte size and hash, then uploads that exact Blob',async()=>{
 const {webcrypto,createHash}=require('node:crypto');const exports={},stages=[],calls=[];
 const original=new Blob([new Uint8Array(plan.AI_VIDEO_MAX_BYTES+1)],{type:'video/quicktime'}),compressed=new Blob(['compressed-video'],{type:'video/mp4'});
 const source=fs.readFileSync(path.join(__dirname,'../src/api/chat.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Blob,crypto:webcrypto,AbortSignal,require:name=>name.includes('prepare-chat-video')?{prepareChatVideo:async file=>{assert.equal(file,original);return compressed;}}:name.includes('chat-stream')?{consumeChatStream:async()=>({id:'chat',turns:[]})}:{apiBaseUrl:'https://api.example',readAuthToken:()=> 'token'},fetch:async(url,options)=>{
  calls.push({url,options});if(url.endsWith('/video-upload'))return {ok:true,json:async()=>({ok:true,data:{url:'https://r2.example/upload',headers:{'Content-Type':'video/mp4'}}})};return {ok:true};
 }});
 await exports.sendChat('chat','request','Find',()=>{},[{id:'video',type:'video',file:original,mimeType:'video/quicktime'}],stage=>stages.push(stage));
 const reservation=JSON.parse(calls[0].options.body).video;assert.equal(reservation.size,compressed.size);assert.equal(reservation.mimeType,'video/mp4');assert.equal(reservation.hash,createHash('sha256').update('compressed-video').digest('hex'));assert.equal(calls[1].options.body,compressed);assert.deepEqual(stages,['preparing_video','upload_video']);
});
