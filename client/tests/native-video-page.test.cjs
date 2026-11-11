const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const path=require('node:path');
function load(name){const module={exports:{}};const source=fs.readFileSync(path.resolve(__dirname,'../../clientNative/components/chat/'+name+'.ts'),'utf8');new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(module,module.exports);return module.exports;}
const {videoPageLocation}=load('video-page'),{videoHtml}=load('video-html');
test('native remote playback keeps complete signed R2 URL and does not prepare a local file',async()=>{
 const uri='https://bucket.r2.example/chatvideo/c/r/0-hash?X-Amz-Credential=a%2Fb&X-Amz-Signature=abc&X-Amz-Expires=3600';
 const page=videoPageLocation(uri);assert.equal(page.source,uri);assert.equal(page.dir,'https://bucket.r2.example/');
 const html=videoHtml(page.source);const assigned=html.match(/v\.src = (.+);/)[1];assert.equal(JSON.parse(assigned),uri);
 const modal=fs.readFileSync(path.resolve(__dirname,'../../clientNative/components/chat/VideoModal.tsx'),'utf8');
 const helpers=modal.slice(modal.indexOf('function inlinePage'),modal.indexOf('export function VideoModal'));
 const compiled=ts.transpileModule(helpers,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const prepare=new Function('videoPageLocation','videoHtml','require',compiled+'\nreturn prepareVideoPage;')(videoPageLocation,videoHtml,()=>{throw Error('remote URL must not access local files');});
 const remote=await prepare(uri);assert.equal(remote.dir,page.dir);assert.equal(JSON.parse(remote.html.match(/v\.src = (.+);/)[1]),uri);
});
test('local playback stays relative while embedded filenames cannot close the script',()=>{
 assert.deepEqual(videoPageLocation('file:///cache/a%20clip.mp4'),{source:'a%20clip.mp4',dir:'file:///cache/'});
 const malicious='https://r2.example/video?value=</script><script>bad()</script>';
 const html=videoHtml(malicious);assert.equal(html.includes('value=</script>'),false);assert.equal(JSON.parse(html.match(/v\.src = (.+);/)[1]),malicious);
});
test('preview releases the media source after drawing the first frame; modal retains it',()=>{
 for(const preview of [true,false]){
  let released=0,draws=0;const listeners={};
  const v={duration:4,currentTime:0,videoWidth:320,videoHeight:180,style:{},addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),removeEventListener:(name,fn)=>listeners[name]=listeners[name].filter(item=>item!==fn),pause(){},play(){this.currentTime=.1;for(const fn of [...(listeners.timeupdate??[])])fn();},removeAttribute:()=>released++,load(){}};
  const document={getElementById:()=>v,addEventListener(){},createElement:()=>({style:{},getContext:()=>({drawImage:()=>draws++})}),body:{appendChild(){}}};
  const window={ReactNativeWebView:{postMessage(){}}};window.addEventListener=()=>{};
  const script=videoHtml('clip.mp4',preview).match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function('document','window',script)(document,window);listeners.loadeddata[0]();
  assert.equal(draws,1);assert.equal(released,preview?1:0);
 }
});
