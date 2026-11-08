const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/components/chat/answer-format.ts'),'utf8');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,URL});
const {answerBlocks,inlineParts,safeAnswerLink}=exportsObject;
test('web and native interpret AI formatting consistently',()=>{
 assert.equal(source,fs.readFileSync(path.join(__dirname,'../../clientNative/components/chat/answer-format.ts'),'utf8'));
});
test('film headings, bullet descriptions and numbered facts are separated correctly',()=>{
 const blocks=answerBlocks('* **Gaston:** Film character.\n* **Lumiere:** Another character.\n\n**Why is it famous?**\n1. **Music:** Memorable songs.\n2. **Oscar:** Award winner.');
 assert.equal(blocks.length,3);assert.equal(blocks[0].kind,'list');assert.equal(blocks[0].items.length,2);
 assert.equal(blocks[1].kind,'heading');assert.equal(blocks[1].text,'Why is it famous?');assert.equal(blocks[2].ordered,true);
 assert.equal(inlineParts(blocks[0].items[0])[0].text,'Gaston:');assert.equal(inlineParts(blocks[0].items[0])[0].kind,'bold');
 assert.equal(answerBlocks('**Music:** Very **good**')[0].kind,'paragraph');
});
test('links reject executable schemes and HTML stays literal text',()=>{
 assert.equal(safeAnswerLink('javascript:alert(1)'),undefined);assert.equal(safeAnswerLink('data:text/html,test'),undefined);
 assert.equal(inlineParts('[unsafe](javascript:evil)')[0].kind,'text');
 assert.equal(inlineParts('<img src=x onerror=alert(1)>')[0].text,'<img src=x onerror=alert(1)>');
 assert.equal(inlineParts('[source](https://example.com/movie)')[0].kind,'link');
});
test('wrapped lists, numbered starts and incomplete streamed text retain their content',()=>{
 const list=answerBlocks('3. **First:** details\n   continued\n4. Second')[0];assert.equal(list.start,3);assert.equal(list.items[0],'**First:** details\ncontinued');
 assert.equal(inlineParts('Hello **unfinished')[0].text,'Hello **unfinished');
 assert.equal(answerBlocks('```text\n**literal**\n```')[0].text,'**literal**');
});
