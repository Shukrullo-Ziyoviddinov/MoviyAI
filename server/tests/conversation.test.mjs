import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Exercise the built service with isolated repositories; never connect to the live DB.
const source = readFileSync(new URL('../dist/ai/services/conversation.service.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function repository(conversation = false) {
  const rows = [];
  function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if ('$ne' in value) return row[key] !== value.$ne;
        if ('$lte' in value) return row[key] <= value.$lte;
      }
      return row[key] === value;
    });
  }
  function query(found, single = false) {
    let data = [...found];
    const q = {
      sort(order) { data.sort((a, b) => { for (const [key, direction] of Object.entries(order)) {
        if (a[key] < b[key]) return -direction; if (a[key] > b[key]) return direction;
      } return 0; }); return q; },
      limit(n) { data = data.slice(0, n); return q; },
      select() { return q; },
      lean: async () => single ? data[0] ?? null : data,
    };
    return q;
  }
  function update(filter, patch, upsert) {
    let row = rows.find(row => matches(row, filter));
    if (!row && upsert) {
      row = { ...filter, _id: filter._id ?? String(rows.length).padStart(8, '0'), createdAt: new Date(),
        ...(conversation ? { title: 'Yangi chat', pinned: false, deletedAt: null, lockToken: '', lockUntil: new Date(0) } : { answer: '', model: '' }),
        ...patch.$setOnInsert };
      rows.push(row);
    }
    if (row) Object.assign(row, patch.$set, { updatedAt: new Date() });
    return row;
  }
  return {
    rows,
    find: filter => query(rows.filter(row => matches(row, filter))),
    findOne: filter => query(rows.filter(row => matches(row, filter)), true),
    findById: id => query(rows.filter(row => row._id === id), true),
    exists: async filter => rows.some(row => matches(row, filter)),
    updateOne: async (filter, patch, options) => update(filter, patch, options?.upsert),
    findOneAndUpdate: async (filter, patch) => update(filter, patch, false),
    deleteMany: async filter => { for(let i=rows.length-1;i>=0;i--)if(matches(rows[i],filter))rows.splice(i,1); },
  };
}
function harness() {
  const Conversation = repository(true), ChatTurn = repository();
  let fail = false, calls = 0, captured, hold;
  const chatWithGemma = async request => {
    calls++; captured = request; if (hold) await hold;
    if (fail) throw Error('provider failure');
    return { text: 'Answer', model: 'gemma-4-26b-a4b-it' };
  };
  const service = new Function('Conversation', 'ChatTurn', 'chatWithGemma', 'randomUUID', source +
    '\nreturn {createConversation,getConversation,listConversations,sendConversationMessage,deleteConversation,pinConversation};')
    (Conversation, ChatTurn, chatWithGemma, randomUUID);
  return { ...service, Conversation, ChatTurn, fail: value => { fail = value; }, hold: value => { hold = value; },
    calls: () => calls, captured: () => captured };
}
test('owners can list/reopen their chats; other accounts cannot read or write them', async () => {
  const h = harness(), id = randomUUID(); await h.createConversation('alice', id);
  assert.equal((await h.listConversations('alice')).length, 1);
  assert.equal((await h.listConversations('bob')).length, 0);
  for (const action of [() => h.getConversation('bob', id), () => h.createConversation('bob', id),
    () => h.sendConversationMessage('bob', id, randomUUID(), 'Private')]) {
    await assert.rejects(action, error => error.status === 404);
  }
});
test('pin state persists on list and reopen, and can be explicitly cleared', async () => {
  const h=harness(),id=randomUUID();await h.createConversation('alice',id);
  assert.equal((await h.getConversation('alice',id)).pinned,false);
  await h.pinConversation('alice',id,true);await h.pinConversation('alice',id,true);
  assert.equal((await h.getConversation('alice',id)).pinned,true);
  assert.equal((await h.listConversations('alice'))[0].pinned,true);
  await h.pinConversation('alice',id,false);
  assert.equal((await h.listConversations('alice'))[0].pinned,false);
});
test('pinning another owner or a deleted conversation is rejected', async () => {
  const h=harness(),id=randomUUID();await h.createConversation('alice',id);
  await assert.rejects(()=>h.pinConversation('bob',id,true),e=>e.status===404);
  assert.equal((await h.getConversation('alice',id)).pinned,false);
  await h.deleteConversation('alice',id);
  await assert.rejects(()=>h.pinConversation('alice',id,true),e=>e.status===404);
});
test('delete removes messages, hides the chat, and cannot be undone by a delayed create retry', async () => {
  const h=harness(),id=randomUUID();await h.createConversation('alice',id);
  await h.sendConversationMessage('alice',id,randomUUID(),'Private message');
  await h.deleteConversation('alice',id);
  assert.equal(h.ChatTurn.rows.length,0);assert.equal((await h.listConversations('alice')).length,0);
  assert.equal(h.Conversation.rows[0].title,'');
  await assert.rejects(()=>h.getConversation('alice',id),error=>error.status===404);
  await assert.rejects(()=>h.createConversation('alice',id),error=>error.status===404);
  await h.deleteConversation('alice',id); // safe retry after a lost response
});
test('other users cannot delete a chat and active generation prevents deletion', async () => {
  const h=harness(),id=randomUUID();await h.createConversation('alice',id);
  await assert.rejects(()=>h.deleteConversation('bob',id),error=>error.status===404);
  h.Conversation.rows[0].lockUntil=new Date(Date.now()+60000);
  await assert.rejects(()=>h.deleteConversation('alice',id),error=>error.status===409);
  assert.equal(h.Conversation.rows[0].deletedAt,null);
});
test('user message is saved on failure; retry and completed replay never duplicate turns', async () => {
  const h = harness(), id = randomUUID(), requestId = randomUUID(); await h.createConversation('alice', id); h.fail(true);
  await assert.rejects(() => h.sendConversationMessage('alice', id, requestId, 'Question'));
  const failed = await h.getConversation('alice', id); assert.equal(failed.turns[0].text, 'Question'); assert.equal(failed.turns[0].status, 'failed');
  h.fail(false); const result = await h.sendConversationMessage('alice', id, requestId, 'Question');
  assert.equal(result.turns.length, 1); assert.equal(result.turns[0].answer, 'Answer');
  await h.sendConversationMessage('alice', id, requestId, 'Question'); assert.equal(h.calls(), 2);
  await assert.rejects(() => h.sendConversationMessage('alice', id, requestId, 'Changed'), error => error.status === 409);
});
test('parallel requests are serialized and unanswered messages must be retried first', async () => {
  const h = harness(), id = randomUUID(); await h.createConversation('alice', id);
  let release; h.hold(new Promise(resolve => { release = resolve; }));
  const first = h.sendConversationMessage('alice', id, randomUUID(), 'First');
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(() => h.sendConversationMessage('alice', id, randomUUID(), 'Second'), error => error.status === 409);
  release(); await first; h.hold(null); h.fail(true);
  await assert.rejects(() => h.sendConversationMessage('alice', id, randomUUID(), 'Failed'));
  await assert.rejects(() => h.sendConversationMessage('alice', id, randomUUID(), 'Bypass'), error => error.status === 409);
});
test('history is built from saved turns and an expired processing turn can be retried', async () => {
  const h = harness(), id = randomUUID(); await h.createConversation('alice', id);
  await h.sendConversationMessage('alice', id, randomUUID(), 'My name is Ali');
  await h.sendConversationMessage('alice', id, randomUUID(), 'What is my name?');
  assert.deepEqual(h.captured().history, [{ role: 'user', text: 'My name is Ali' }, { role: 'model', text: 'Answer' }]);
  h.ChatTurn.rows[1].status = 'processing';
  const chat = await h.getConversation('alice', id); assert.equal(chat.turns[1].status, 'failed');
  await h.sendConversationMessage('alice', id, chat.turns[1].requestId, 'What is my name?');
  assert.equal(h.ChatTurn.rows.length, 2);
});
