const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function player(telegram){
 const mocks={react:{useEffect(){},useRef:()=>({current:null})},'react-dom':{createPortal:node=>node},'@/components/icons':{CloseIcon:'close-icon'},'@/components/language/language-state':{useLanguage:()=>({language:'uz'})},'./watch-modal-history':{watchModalHistory(){}},'@/components/telegram/TelegramFullscreen':{TelegramNav:'telegram-nav',useTelegramChrome:()=>({active:telegram})}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/components/movie/WatchPlayerModal.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','exports','module','document',code)(name=>mocks[name]??require(name),module.exports,module,{body:{}});
 return module.exports.WatchPlayerModal({url:'https://ok.ru/video/123',embedUrl:null,loading:false,onClose(){},onOther(){},hasOther:false});
}
test('Telegram player reserves its existing chrome inset and draws the same Telegram toolbar background inside the dialog',()=>{
 const tree=player(true),[toolbar,content]=tree.props.children;
 assert.equal(toolbar.type,'telegram-nav');assert.equal(content.props.style.paddingTop,'calc(var(--tg-chrome, 0px) + 16px)');
 assert.equal(content.props.children[0].type,'header');
});
test('ordinary browser player retains its previous padding and has no Telegram toolbar',()=>{
 const tree=player(false),[toolbar,content]=tree.props.children;
 assert.equal(toolbar,false);assert.equal(content.props.style,undefined);assert.match(content.props.className,/pt-\[max\(16px,env\(safe-area-inset-top\)\)\]/);
});
