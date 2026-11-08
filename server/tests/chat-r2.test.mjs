import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../dist/services/r2.service.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\r?\n/gm, '').replace(/\bexport /g, '');
function harness() {
  const commands = []; let missing = false, ignoredRange = false;
  class Command { constructor(input) { this.input = input; } }
  class HeadCommand extends Command {}
  class S3Client { async send(command) {
    commands.push(command.input);
    if (missing) throw Object.assign(Error('missing'), { name: 'NoSuchKey' });
    if (command instanceof HeadCommand) return {ContentLength: 68, ContentType:'image/png'};
    if (command.input.Range) return { ContentLength: ignoredRange ? 68 : 12,
      ContentRange: ignoredRange ? undefined : 'bytes 0-11/68', Body: {destroy(){},transformToByteArray:async()=>new Uint8Array(12)} };
    return { Body: { transformToByteArray: async () => new Uint8Array([1,2,3]) } };
  } }
  const api = new Function('S3Client','PutObjectCommand','GetObjectCommand','DeleteObjectCommand','HeadObjectCommand','env',source+
    '\nreturn {chatImageKey,putChatImage,getChatImage,deleteChatImage,isImageFolder,inspectChatImage};')
    (S3Client,Command,Command,Command,HeadCommand,{r2Endpoint:'https://example.com',r2AccessKeyId:'test',r2SecretAccessKey:'test',r2Bucket:'test'});
  return {...api,commands,ignoreRange:()=>{ignoredRange=true;},missing:()=>{missing=true;}};
}
test('chat R2 keys are isolated from public folders and reject path traversal',async()=>{
  const h=harness(),hash='a'.repeat(64),key=h.chatImageKey('chat','request',0,hash);
  assert.equal(h.isImageFolder('chatimg'),false);
  assert.throws(()=>h.chatImageKey('../movieimg','request',0,hash));
  assert.throws(()=>h.chatImageKey('chat','request',3,hash));
  await assert.rejects(()=>h.deleteChatImage('movieimg/poster.jpg'));
  await h.putChatImage(key,Buffer.from([1,2,3]),'image/jpeg');
  assert.equal(h.commands[0].Key,key);assert.equal(h.commands[0].CacheControl,'private, no-store');
  assert.deepEqual(await h.getChatImage(key),Buffer.from([1,2,3]));
  await h.deleteChatImage(key);assert.equal(h.commands[2].Key,key);
  h.missing();assert.equal(await h.getChatImage(key),null);
});
test('inspection reads only 12 bytes and refuses a server that ignores Range',async()=>{
 const h=harness(),key=h.chatImageKey('chat','request',0,'a'.repeat(64));
 const result=await h.inspectChatImage(key);assert.equal(result.bytes.length,12);assert.equal(h.commands[1].Range,'bytes=0-11');
 h.ignoreRange();await assert.rejects(()=>h.inspectChatImage(key),/INVALID_CHAT_IMAGE_RANGE/);
});
