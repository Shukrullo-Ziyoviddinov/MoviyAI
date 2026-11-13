const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const moduleSource=ts.transpileModule(fs.readFileSync('src/utils/side-menu-responder.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const loaded={exports:{}};new Function('exports','module',moduleSource)(loaded.exports,loaded);const {drawerResponder}=loaded.exports;
function harness(open=false){const state={open,gesturesSuspended:false,gestureRevision:0,openFromGesture(revision){if(!state.gesturesSuspended&&revision===state.gestureRevision)state.open=true;},closeMenu(){state.open=false;}};return {state,handlers:drawerResponder(open?'close':'open',()=>state)};}
const event={};const move=(extra={})=>({x0:10,dx:80,dy:2,vx:0.2,...extra});
test('normal taps, vertical scrolls and horizontal content swipes do not open the drawer',()=>{
 const {state,handlers}=harness();assert.equal(handlers.onStartShouldSetPanResponder(event,move()),false);
 for(const gesture of [move({dx:0,dy:0}),move({dx:8,dy:100}),move({x0:150})]){assert.equal(handlers.onMoveShouldSetPanResponderCapture(event,gesture),false);handlers.onPanResponderRelease(event,gesture);assert.equal(state.open,false);}
});
test('an intentional swipe from the left edge opens the drawer after release',()=>{
 const {state,handlers}=harness();handlers.onStartShouldSetPanResponder(event,move());assert.equal(handlers.onMoveShouldSetPanResponderCapture(event,move()),true);assert.equal(state.open,false);handlers.onPanResponderRelease(event,move());assert.equal(state.open,true);
});
test('menu history scroll does not close the drawer; horizontal closing does',()=>{
 const {state,handlers}=harness(true);handlers.onStartShouldSetPanResponder(event,move());assert.equal(handlers.onMoveShouldSetPanResponderCapture(event,move({dx:-5,dy:100})),false);assert.equal(state.open,true);
 assert.equal(handlers.onMoveShouldSetPanResponderCapture(event,move({dx:-80})),true);handlers.onPanResponderRelease(event,move({dx:-80}));assert.equal(state.open,false);
});
test('picker round trip invalidates the touch that started before it',()=>{
 const {state,handlers}=harness();handlers.onStartShouldSetPanResponder(event,move());state.gesturesSuspended=true;state.gestureRevision++;assert.equal(handlers.onMoveShouldSetPanResponderCapture(event,move()),false);
 state.gesturesSuspended=false;state.gestureRevision++;handlers.onPanResponderRelease(event,move());assert.equal(state.open,false);
 handlers.onStartShouldSetPanResponder(event,move());handlers.onPanResponderRelease(event,move());assert.equal(state.open,true);
});
test('canceled gestures cannot later open the drawer',()=>{
 const {state,handlers}=harness();handlers.onStartShouldSetPanResponder(event,move());handlers.onPanResponderTerminate(event,move());handlers.onPanResponderRelease(event,move());assert.equal(state.open,false);
});

test('drag updates continuously, including reversing direction before release',()=>{
 const {state}=harness();const values=[];let ended;
 const handlers=drawerResponder('open',()=>state,{start(){values.push('start');},move(dx){values.push(dx);},end(gesture,valid){ended={dx:gesture.dx,valid};}});
 handlers.onStartShouldSetPanResponder(event,move());
 handlers.onPanResponderGrant(event,move({dx:20}));
 handlers.onPanResponderMove(event,move({dx:130}));
 handlers.onPanResponderMove(event,move({dx:35}));
 assert.deepEqual(values,['start',20,130,35]);
 assert.equal(state.open,false);
 handlers.onPanResponderRelease(event,move({dx:35}));
 assert.deepEqual(ended,{dx:35,valid:true});
});
test('an interrupted or invalidated drag settles without committing a stale opening',()=>{
 const {state}=harness();const results=[];const values=[];
 const handlers=drawerResponder('open',()=>state,{start(){},move(dx){values.push(dx);},end(_gesture,valid){results.push(valid);}});
 handlers.onStartShouldSetPanResponder(event,move());handlers.onPanResponderGrant(event,move({dx:20}));
 state.gestureRevision++;
 handlers.onPanResponderMove(event,move({dx:120}));
 handlers.onPanResponderRelease(event,move());
 assert.deepEqual(values,[20]);assert.deepEqual(results,[false]);assert.equal(state.open,false);
 handlers.onStartShouldSetPanResponder(event,move());handlers.onPanResponderGrant(event,move());handlers.onPanResponderTerminate(event,move());
 assert.deepEqual(results,[false,false]);
});
