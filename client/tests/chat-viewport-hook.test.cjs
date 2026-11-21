const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function compile(file){return ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;}
const helpers={};new Function('exports',compile('src/components/chat/chat-viewport.ts'))(helpers);
function target(extra={}){const events=new Map();return {...extra,events,addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener(name,fn){events.get(name)?.delete(fn);},emit(name){for(const fn of events.get(name)??[])fn();},count(){return [...events.values()].reduce((sum,items)=>sum+items.size,0);}};}
for(const telegram of [false,true])test(`${telegram?'Telegram':'web'}: viewport updates keep input anchored, follow sidebar size and remove every listener`,()=>{
 const effects=[],frames=new Map();let id=0,observer;
 const visual=target({height:780,offsetTop:0,scale:1});const native=target({viewportHeight:780,viewportStableHeight:780,safeAreaInset:{bottom:24},contentSafeAreaInset:{bottom:12}});native.onEvent=native.addEventListener;native.offEvent=native.removeEventListener;
 const win=target({innerHeight:780,visualViewport:visual,Telegram:{WebApp:native},matchMedia:()=>({matches:false})});
 const values=new Map([['--chat-viewport-height','initial-height']]);
 const parent={clientHeight:780,bounds:{left:300,top:0,width:900},getBoundingClientRect(){return this.bounds;}};
 const element=target({parentElement:parent,style:{transition:'',getPropertyValue:key=>values.get(key)??'',setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)}});
 class ResizeObserver{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}}
 const module={exports:{}};
 new Function('require','exports','module','window','requestAnimationFrame','cancelAnimationFrame','ResizeObserver',compile('src/components/chat/useChatViewport.ts'))(
  name=>name==='react'?{useEffect:fn=>effects.push(fn)}:helpers,module.exports,module,win,fn=>{frames.set(++id,fn);return id;},key=>frames.delete(key),ResizeObserver);
 module.exports.useChatViewport({current:element},telegram);const cleanup=effects[0]();
 const flush=()=>{for(const [key,fn] of [...frames]){frames.delete(key);fn();}};
 flush();assert.equal(values.get('--chat-viewport-left'),'300px');assert.equal(values.get('--chat-viewport-width'),'900px');
 visual.height=360;visual.emit('resize');flush();assert.equal(values.get('--chat-viewport-height'),'360px');assert.equal(values.get('--chat-composer-bottom'),'8px');
 native.viewportStableHeight=360;native.viewportHeight=360;native.emit('viewportChanged');flush();assert.equal(values.get('--chat-composer-bottom'),'8px');
 visual.height=780;visual.emit('resize');flush();assert.equal(values.get('--chat-viewport-height'),'780px');
 parent.bounds={left:72,top:-60,width:1128};visual.offsetTop=40;win.emit('scroll');observer.fn();flush();assert.equal(values.get('--chat-viewport-top'),'40px');assert.equal(values.get('--chat-viewport-left'),'72px');
 cleanup();assert.equal(win.count(),0);assert.equal(visual.count(),0);assert.equal(native.count(),0);assert.equal(element.count(),0);assert.equal(observer.disconnected,true);assert.equal(frames.size,0);assert.equal(values.get('--chat-viewport-height'),'initial-height');
});
