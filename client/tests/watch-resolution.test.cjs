const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);return module.exports;}
const provider=load('../src/utils/watch-provider.ts');
const {resolveWatchSource}=load('../src/utils/watch-resolution.ts',{'./watch-provider':provider});
const page='https://ok.ru/video/123';
test('a stalled embed request is aborted by its own deadline',async context=>{
 let aborted=false;
 context.mock.method(globalThis,'fetch',async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true})));
 assert.equal(await resolveWatchSource('https://api.example.com',page,new AbortController().signal,5),null);assert.equal(aborted,true);
});
test('caller cancellation prevents starting work and cancels an active request',async context=>{
 let calls=0;context.mock.method(globalThis,'fetch',async(_url,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));});
 const first=new AbortController();first.abort();assert.equal(await resolveWatchSource('https://api.example.com',page,first.signal),null);assert.equal(calls,0);
 const second=new AbortController(),pending=resolveWatchSource('https://api.example.com',page,second.signal);second.abort();assert.equal(await pending,null);assert.equal(calls,1);
});
test('HTTP failures and mismatched embed identities never become players',async context=>{
 context.mock.method(globalThis,'fetch',async()=>({ok:false}));assert.equal(await resolveWatchSource('',page,new AbortController().signal),null);
 globalThis.fetch=async()=>({ok:true,json:async()=>({source:{embedUrl:'https://ok.ru/videoembed/124'}})});
 assert.equal(await resolveWatchSource('',page,new AbortController().signal),null);
});
test('web and native share the same bounded resolver',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../src/utils/watch-resolution.ts'),'utf8'),fs.readFileSync(path.join(__dirname,'../../clientNative/src/utils/watch-resolution.ts'),'utf8'));
});
