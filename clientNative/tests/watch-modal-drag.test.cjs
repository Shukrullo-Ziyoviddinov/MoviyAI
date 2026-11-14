const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function modal(visible=true){
 const effects=[],animations=[],state=[];let pan,closed=0,progress;
 class Value{constructor(value){progress=this;this.value=value;this.listeners=new Map();}addListener(fn){this.listeners.set('id',fn);return 'id';}removeListener(id){this.listeners.delete(id);}stopAnimation(callback){callback?.(this.value);}setValue(value){this.value=value;for(const fn of this.listeners.values())fn({value});}interpolate(){return {};}}
 const Animated={Value,View:'animated-view',timing(value,options){return {start(done){animations.push({value,options,finish(){value.setValue(options.toValue);done?.({finished:true});}});}};}};
 const mocks={react:{useRef:current=>({current}),useState:value=>[value,next=>state.push(next)],useCallback:fn=>fn,useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)},'react-native':{
  Animated,Easing:{out:fn=>fn,cubic:()=>{}},Modal:'modal',View:'view',Text:'text',Pressable:'pressable',ScrollView:'scrollview',StyleSheet:{create:s=>s,absoluteFill:{}},useWindowDimensions:()=>({height:800}),PanResponder:{create(config){pan=config;return {panHandlers:{}};}},
 },'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'react-i18next':{useTranslation:()=>({t:key=>key})},'@/components/icons':{PlayIcon:'play'},'@/src/stores/useThemeStore':{useTheme:()=>({colors:{}})},'@/src/utils/watch-options':{watchOptions:()=>[{url:'https://one.example/film',domain:'one.example'},{url:'https://two.example/film',domain:'two.example'}]}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('components/movie/WatchOptionModal.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);
 const tree=module.exports.WatchOptionModal({visible,onClose:()=>closed++,movie:{},onSelect(){}});
 for(const effect of effects)effect();
 if(tree){tree.props.onShow();animations.shift().finish();}
 return {tree,pan,animations,progress,closed:()=>closed};
}
const event={};const gesture=(dy,vy=0)=>({dy,dx:0,vy});
test('native header owns the initial touch before the Modal host can swallow drag events',()=>{
 const h=modal();assert.equal(h.pan.onStartShouldSetPanResponderCapture(event,gesture(0)),true);assert.equal(h.pan.onStartShouldSetPanResponder(event,gesture(0)),true);
 h.pan.onPanResponderGrant();h.pan.onPanResponderMove(event,gesture(120));
 h.pan.onPanResponderRelease(event,gesture(120));assert.equal(h.closed(),1);
});
test('a short drag returns smoothly to open; a fast downward flick closes',()=>{
 const h=modal();h.pan.onPanResponderGrant();h.pan.onPanResponderMove(event,gesture(10));h.pan.onPanResponderRelease(event,gesture(10));
 assert.equal(h.closed(),0);assert.equal(h.animations.at(-1).options.toValue,1);
 h.animations.pop().finish();h.pan.onPanResponderGrant();h.pan.onPanResponderMove(event,gesture(10));h.pan.onPanResponderRelease(event,gesture(10,1));assert.equal(h.closed(),1);
});
test('a hidden/closing modal does not claim new header touches',()=>{
 const h=modal(false);assert.equal(h.pan.onStartShouldSetPanResponderCapture(event,gesture(0)),false);assert.equal(h.pan.onMoveShouldSetPanResponderCapture(event,gesture(80)),false);
});

test('after a drag-close and reopen, a header tap never closes from an old or partial opening position',()=>{
 const h=modal();h.pan.onPanResponderGrant();h.pan.onPanResponderMove(event,gesture(120));h.pan.onPanResponderRelease(event,gesture(120));assert.equal(h.closed(),1);
 for(const position of [0,0.2,0.6,1]){
  h.progress.setValue(position);h.tree.props.onShow();
  h.pan.onPanResponderGrant();h.pan.onPanResponderRelease(event,gesture(0));
  assert.equal(h.closed(),1);assert.equal(h.animations.at(-1).options.toValue,1);
 }
});
test('tiny touch jitter cannot dismiss a reopened sheet even with noisy release velocity',()=>{
 const h=modal();h.progress.setValue(0.3);h.pan.onPanResponderGrant();h.pan.onPanResponderMove(event,gesture(2));h.pan.onPanResponderRelease(event,gesture(2,2));
 assert.equal(h.closed(),0);assert.equal(h.animations.at(-1).options.toValue,1);
});
