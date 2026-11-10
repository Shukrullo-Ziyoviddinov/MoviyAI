import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../dist/services/catalog-transaction.service.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
function harness() {
  const counters = new Map(), events = []; let lastMovie = 8050, lastActor = 9010;
  const session = { inTransaction: () => true };
  const counter = {
    createCollection: async () => { events.push('collection'); },
    async updateOne(query, update, options) {
      if (update.$setOnInsert && !counters.has(query._id)) counters.set(query._id, update.$setOnInsert.value);
      if (update.$inc) { assert.equal(options.session, session); counters.set(query._id, counters.get(query._id) + update.$inc.value); events.push('gate'); }
      return { matchedCount: 1 };
    },
    async findOneAndUpdate(query, update, options) { assert.equal(options.session, session); const current = counters.get(query._id) ?? 0; const value = update.$max ? Math.max(current, update.$max.value) : current + update.$inc.value; counters.set(query._id, value); return { value }; },
  };
  const model = kind => ({ createIndexes: async () => { events.push(`indexes:${kind}`); }, findOne: () => ({ sort() { return this; }, select() { return this; }, session(value) { assert.equal(value, session); return this; }, async lean() { return { id: kind === 'movie' ? lastMovie : lastActor }; } }) });
  const mongoose = { connection: { transaction: async (work, options) => { assert.equal(options.readConcern.level, 'snapshot'); assert.equal(options.writeConcern.w, 'majority'); return work(session); } } };
  const api = new Function('mongoose', 'CatalogCounter', 'Movie', 'Actor', source + '\nreturn {withCatalogTransaction,allocateCatalogId};')(mongoose, counter, model('movie'), model('actor'));
  return { ...api, session, counters, events, setLastMovie: value => { lastMovie = value; }, setLastActor: value => { lastActor = value; } };
}
test('transaction obtains the durable gate before writes; counters account for existing catalogue IDs and are not reused after deletion', async () => {
  const h = harness();
  const first = await h.withCatalogTransaction(async session => { assert.equal(h.events.at(-1), 'gate'); return h.allocateCatalogId('movie', session); });
  assert.equal(first, 8051); h.setLastMovie(8000);
  assert.equal(await h.withCatalogTransaction(session => h.allocateCatalogId('movie', session)), 8052);
  assert.equal(await h.withCatalogTransaction(session => h.allocateCatalogId('actor', session)), 9011);
  h.setLastActor(9500); assert.equal(await h.withCatalogTransaction(session => h.allocateCatalogId('actor', session)), 9501);
  assert.equal(h.events.filter(event => event === 'collection').length, 1);
});
test('ID allocation fails closed outside a transaction and before overflowing safe numeric IDs', async () => {
  const h = harness(); await assert.rejects(() => h.allocateCatalogId('movie', { inTransaction: () => false }), /TRANSACTION_REQUIRED/);
  h.counters.set('movie', Number.MAX_SAFE_INTEGER); await assert.rejects(() => h.withCatalogTransaction(session => h.allocateCatalogId('movie', session)), /EXHAUSTED/);
});
