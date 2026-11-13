const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(path,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports','module',code)(name=>mocks[name]??require(name),module.exports,module);return module.exports;}
for(const type of ['image','video'])test(`${type} picker rejects stale menu events both during selection and after Done`,async()=>{
 const menu=load('src/stores/useSideMenuStore.ts').useSideMenuStore;let complete;
 const composer=load('src/stores/useComposerStore.ts',{'./useSideMenuStore':{useSideMenuStore:menu},'react-native':{Alert:{alert(){}}},'expo-image-picker':{UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'},launchImageLibraryAsync:()=>new Promise(resolve=>{complete=resolve;})}}).useComposerStore;
 menu.getState().openMenu();const staleRevision=menu.getState().gestureRevision;menu.getState().closeMenu();
 const pending=composer.getState().pickFromDevice(type);
 assert.equal(menu.getState().gesturesSuspended,true);menu.getState().openFromGesture(staleRevision);menu.getState().openMenu();assert.equal(menu.getState().open,false);
 complete({canceled:false,assets:[{uri:`file://picked.${type==='video'?'mp4':'jpg'}`,duration:10000,width:720,height:544}]});await pending;
 assert.equal(composer.getState().selectedMedia.length,1);assert.equal(menu.getState().gesturesSuspended,false);
 menu.getState().openFromGesture(staleRevision);assert.equal(menu.getState().open,false);
 menu.getState().openFromGesture(menu.getState().gestureRevision);assert.equal(menu.getState().open,true);
});
test('canceling the picker unlocks the menu without accepting the old touch',async()=>{
 const menu=load('src/stores/useSideMenuStore.ts').useSideMenuStore;const revision=menu.getState().gestureRevision;
 const composer=load('src/stores/useComposerStore.ts',{'./useSideMenuStore':{useSideMenuStore:menu},'react-native':{Alert:{alert(){}}},'expo-image-picker':{launchImageLibraryAsync:async()=>({canceled:true})}}).useComposerStore;
 await composer.getState().pickFromDevice('video');assert.equal(menu.getState().gesturesSuspended,false);menu.getState().openFromGesture(revision);assert.equal(menu.getState().open,false);menu.getState().openMenu();assert.equal(menu.getState().open,true);
});

test('switching between photos and video never leaves an unsendable mixed selection',async()=>{
 const menu=load('src/stores/useSideMenuStore.ts').useSideMenuStore;
 const composer=load('src/stores/useComposerStore.ts',{'./useSideMenuStore':{useSideMenuStore:menu},'react-native':{Alert:{alert(){}}},'expo-image-picker':{UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'},launchImageLibraryAsync:async options=>({canceled:false,assets:options.mediaTypes[0]==='videos'?[{uri:'file://video.mp4'}]:[1,2,3,4].map(id=>({uri:`file://${id}.jpg`}))})}}).useComposerStore;
 await composer.getState().pickFromDevice('image');assert.equal(composer.getState().selectedMedia.length,3);
 await composer.getState().pickFromDevice('video');assert.deepEqual(composer.getState().selectedMedia.map(item=>item.type),['video']);
 await composer.getState().pickFromDevice('image');assert.equal(composer.getState().selectedMedia.length,3);assert.ok(composer.getState().selectedMedia.every(item=>item.type==='image'));
});

test('picker errors release the lock so menu buttons continue working',async()=>{
 const menu=load('src/stores/useSideMenuStore.ts').useSideMenuStore;
 const composer=load('src/stores/useComposerStore.ts',{'./useSideMenuStore':{useSideMenuStore:menu},'react-native':{Alert:{alert(){}}},'expo-image-picker':{launchImageLibraryAsync:async()=>{throw Error('picker unavailable');}}}).useComposerStore;
 await composer.getState().pickFromDevice('video');assert.equal(menu.getState().gesturesSuspended,false);assert.equal(composer.getState().picking,false);menu.getState().openMenu();assert.equal(menu.getState().open,true);
});
