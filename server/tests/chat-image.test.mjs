import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
const source = readFileSync(new URL('../dist/ai/services/chat-image.service.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function harness() {
  let deleted = false;
  const Conversation = { exists: async query => !deleted && query._id === 'chat' && query.userId === 'alice' && query.deletedAt === null };
  const ChatTurn = { findOne: query => ({select(){return this;},lean:async()=>query.userId === 'alice' ? {images:[{key:'private-key'}]} : null}) };
  const api = new Function('jwt', 'env', 'Conversation', 'ChatTurn', 'chatImageUrls', source + '\nreturn {imagePath,readChatImage};')
    (jwt, { jwtSecret: 'test-secret-only' }, Conversation, ChatTurn, async()=>[{mimeType:'image/jpeg',fileUri:'https://r2.example/image'}]);
  return { ...api, remove: () => { deleted = true; } };
}
test('image link is scoped to the owner, conversation and request', async () => {
  const h = harness(); const path = h.imagePath('alice', 'chat', 'request', 0);
  const token = new URL(path, 'https://example.com').searchParams.get('token');
  assert.equal((await h.readChatImage('chat', 'request', 0, token)).mimeType, 'image/jpeg');
  assert.equal(await h.readChatImage('other', 'request', 0, token), null);
  assert.equal(await h.readChatImage('chat', 'other', 0, token), null);
  assert.equal(await h.readChatImage('chat', 'request', 0, token + 'bad'), null);
  assert.equal(await h.readChatImage('chat', 'request', 1, token), null);
  h.remove(); assert.equal(await h.readChatImage('chat', 'request', 0, token), null);
});
