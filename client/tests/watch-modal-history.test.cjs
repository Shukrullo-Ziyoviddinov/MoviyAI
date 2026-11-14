const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
const moduleObject={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('src/components/movie/watch-modal-history.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(moduleObject.exports);
const {watchModalHistory}=moduleObject.exports;
function browser(){const listeners=[];let pushes=0,backs=0;
 const target={history:{pushState(){pushes++;},back(){backs++;queueMicrotask(()=>{let stopped=false;const event={stopImmediatePropagation(){stopped=true;}};for(const item of [...listeners].sort((a,b)=>Number(b.capture)-Number(a.capture))){if(stopped)break;item.handler(event);}});}},addEventListener(_name,handler,capture=false){listeners.push({handler,capture});},removeEventListener(_name,handler){const index=listeners.findIndex(item=>item.handler===handler);if(index>=0)listeners.splice(index,1);}};
 return {target,pushes:()=>pushes,backs:()=>backs,listeners};}
for(const viaBack of [false,true])test(`watch options close ${viaBack?'by browser Back':'by backdrop/button'} without closing the underlying trailer`,async()=>{
 const b=browser();let parentClosed=0,watchClosed=0;
 b.target.addEventListener('popstate',()=>parentClosed++);
 const close=watchModalHistory(()=>watchClosed++,b.target);
 assert.equal(b.pushes(),1);
 if(viaBack)b.target.history.back();else{close();close();}
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(watchClosed,1);assert.equal(parentClosed,0);assert.equal(b.backs(),1);assert.equal(b.listeners.length,1);
 b.target.history.back();await new Promise(resolve=>setImmediate(resolve));assert.equal(parentClosed,1);
});
