const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/media/video-poster.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function harness({decoder=false,fail=false,hang=false}={}){
 const exports={},videos=[],canvases=[];let inputs=0,disposed=0;const timers=[];
 const document={createElement(type){
  if(type==='canvas'){const canvas={width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,FRAME'};canvases.push(canvas);return canvas;}
  const video={src:'',videoWidth:1920,videoHeight:1080,readyState:2,seeking:false,duration:3,pause(){this.paused=true;},removeAttribute(){this.src='';},load(){if(!this.src)return;queueMicrotask(()=>{if(fail)this.onerror?.();else this.onloadedmetadata?.();});},play(){throw Error('Preview must never autoplay');}};
  Object.defineProperty(video,'currentTime',{set(value){this.seekTime=value;this.seeking=true;queueMicrotask(()=>{this.seeking=false;this.onseeked?.();});}});videos.push(video);return video;
 }};
 class Input{constructor(){inputs++;}async getPrimaryVideoTrack(){if(hang)return new Promise(()=>{});return {displayWidth:1080,displayHeight:1920};}dispose(){disposed++;}}
 class CanvasSink{constructor(_track,options){this.options=options;}async getCanvas(){return {canvas:{width:this.options.width,height:this.options.height}};}}
 const context={exports,document,queueMicrotask,setTimeout(callback){timers.push(callback);return timers.length-1;},clearTimeout(id){timers[id]=null;},require:name=>{assert.equal(name,'mediabunny');return {Input,CanvasSink,UrlSource:class{},ALL_FORMATS:[]};}};
 if(decoder)context.VideoDecoder=function(){};
 vm.runInNewContext(source,context);
 return {...exports,videos,canvases,timers,inputs:()=>inputs,disposed:()=>disposed};
}
test('older Telegram WebViews extract a frame by inline seek without autoplay and release media',async()=>{
 const h=harness();const image=await h.videoPoster('blob:frame');
 assert.equal(image,'data:image/jpeg;base64,FRAME');assert.equal(h.videos[0].playsInline,true);assert.equal(h.videos[0].muted,true);assert.equal(h.videos[0].seekTime,0.1);
 assert.equal(h.videos[0].src,'');assert.equal(h.videos[0].onseeked,null);assert.equal(h.videos[0].paused,true);assert.equal(h.canvases[0].width,320);assert.ok(h.canvases[0].height<=480);
});
test('WebCodecs frame extraction bypasses video element playback and disposes the decoder',async()=>{
 const h=harness({decoder:true});assert.equal(await h.videoPoster('https://r2.example/video'),'data:image/jpeg;base64,FRAME');
 assert.equal(h.inputs(),1);assert.equal(h.disposed(),1);assert.equal(h.videos.length,0);assert.ok(h.canvases[0].height<=480);
});
test('poster cache deduplicates work and evicts old images rather than growing forever',async()=>{
 const h=harness();const first=h.videoPoster('blob:0');assert.equal(h.videoPoster('blob:0'),first);await first;
 for(let index=1;index<=16;index++)await h.videoPoster('blob:'+index);
 assert.equal(h.videos.length,17);await h.videoPoster('blob:0');assert.equal(h.videos.length,18);
});
test('a failed preview remains retryable instead of permanently caching a blank block',async()=>{
 const h=harness({fail:true});assert.equal(await h.videoPoster('blob:bad'),null);await h.videoPoster('blob:bad');assert.equal(h.videos.length,2);
});
test('a stalled decoder times out, releases resources and falls back to inline seeking',async()=>{
 const h=harness({decoder:true,hang:true});const pending=h.videoPoster('blob:slow');
 await new Promise(resolve=>setImmediate(resolve));h.timers[0]();
 assert.equal(await pending,'data:image/jpeg;base64,FRAME');assert.equal(h.disposed(),1);assert.equal(h.videos.length,1);
});

function preview({telegram=false,platform,poster=null,uri='video.mp4'}={}){
 const exports={},calls=[],updates=[];
 const code=ts.transpileModule(fs.readFileSync('src/components/chat/VideoPreview.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,window:{Telegram:{WebApp:{platform}}},require:name=>{
  if(name==='react')return {useEffect:effect=>effect(),useRef:()=>({current:null}),useState:()=>[poster,value=>updates.push(value)]};
  if(name.includes('TelegramFullscreen'))return {useTelegramChrome:()=>({active:telegram})};
  if(name.includes('video-poster'))return {videoPoster:async source=>{calls.push(source);return 'data:image/jpeg;base64,FRAME';}};
  return require(name);
 }});
 return {tree:exports.VideoPreview({uri}),calls,updates};
}
test('Chrome keeps the normal inline preview while Telegram mobile and desktop prepare a poster',async()=>{
 const chrome=preview();assert.equal(chrome.calls.length,0);assert.equal(chrome.tree.props.children.type,'video');assert.equal(chrome.tree.props.children.props.playsInline,true);
 for(const options of [{telegram:true},{platform:'tdesktop'}]){
  const result=preview(options);await new Promise(resolve=>setImmediate(resolve));assert.equal(result.calls.length,1);assert.equal(result.updates[0].uri,'video.mp4');
 }
});
test('a poster from another video is never shown while a new frame is being prepared',()=>{
 const stale=preview({telegram:true,uri:'new.mp4',poster:{uri:'old.mp4',image:'old-frame'}});assert.equal(stale.tree.props.children.type,'video');
 const ready=preview({telegram:true,uri:'new.mp4',poster:{uri:'new.mp4',image:'new-frame'}});assert.equal(ready.tree.props.children.type,'img');assert.equal(ready.tree.props.children.props.src,'new-frame');
});
