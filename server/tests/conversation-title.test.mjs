import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationTitle} from '../dist/ai/services/conversation-title.service.js';

test('a found film uses its localized name and year without another AI request',async()=>{
 const result=await conversationTitle([{text:'Videodagi kinoni top',movie:{title:'Spider-Man 2',titleUz:'O‘rgimchak odam 2',year:2004}}],async()=>{throw Error('Must not call AI');});
 assert.equal(result,'O‘rgimchak odam 2 (2004)');
});
test('text titles summarize recent user and assistant messages rather than the initial greeting',async()=>{
 let context;
 const title=await conversationTitle([{text:'Salom',answer:'Salom!'}, {text:'Filmni rejissyor qanday yaratadi?',answer:'Rejissyor ssenariy va aktyorlar bilan ishlaydi.'}],async value=>{context=JSON.parse(value);return '**Rejissyorning kino yaratish jarayoni**';});
 assert.equal(title,'Rejissyorning kino yaratish jarayoni');
 assert.equal(context.at(-1).user,'Filmni rejissyor qanday yaratadi?');
 assert.ok(context.at(-1).assistant.includes('aktyorlar'));
});
test('title API errors, empty results and greetings do not fail chat naming',async()=>{
 assert.equal(await conversationTitle([{text:'Salom!'}],async()=>{throw Error('Must not call AI');}),'Kino haqida suhbat');
 for(const generate of [async()=>{throw Error('503');},async()=>'',async()=>'https://example.com'])
  assert.equal(await conversationTitle([{text:'Kino janrlari nima?'}],generate),'Kino haqida suhbat');
 assert.equal(await conversationTitle([{text:'Tavsiya ber',recommendations:[{movie:{title:'One'}},{movie:{title:'Two'}}]}],async()=>''),'Kino tavsiyalari');
});
test('title context and displayed names are bounded',async()=>{
 let context;
 const title=await conversationTitle(Array.from({length:20},()=>({text:'x'.repeat(2000),answer:'a'.repeat(3000)})),async value=>{context=JSON.parse(value);return 'Mavzu '.repeat(100);});
 assert.equal(context.length,4);assert.equal(context[0].user.length,600);assert.equal(context[0].assistant.length,1000);assert.ok(title.length<=64);
});
