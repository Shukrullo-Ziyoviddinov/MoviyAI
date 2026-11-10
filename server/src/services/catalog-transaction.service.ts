import mongoose, { type ClientSession } from 'mongoose';
import { CatalogCounter } from '../models/CatalogCounter.js';
import { Movie } from '../models/Movie.js';
import { Actor } from '../models/Actor.js';

let initialization: Promise<void> | undefined;
async function initialize() {
  // Index creation never runs inside a transaction. No syncIndexes/dropIndexes.
  await CatalogCounter.createCollection();
  await Promise.all([Movie.createIndexes(), Actor.createIndexes()]);
  try { await CatalogCounter.updateOne({ _id: 'write-gate' }, { $setOnInsert: { value: 0 } }, { upsert: true }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
}
export async function withCatalogTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  initialization ??= initialize().catch(error => { initialization = undefined; throw error; });
  await initialization;
  return mongoose.connection.transaction(async session => {
    // A shared DB write, not an in-process mutex: concurrent instances retry on
    // transaction write conflict, then re-read duplicates using a fresh snapshot.
    const gate = await CatalogCounter.updateOne({ _id: 'write-gate' }, { $inc: { value: 1 } }, { session });
    if (gate.matchedCount !== 1) { initialization = undefined; throw new Error('CATALOG_WRITE_GATE_MISSING'); }
    return work(session);
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 15000 });
}

export async function allocateCatalogId(kind: 'movie' | 'actor', session: ClientSession): Promise<number> {
  if (!session.inTransaction()) throw new Error('CATALOG_TRANSACTION_REQUIRED');
  const last = kind === 'movie'
    ? await Movie.findOne().sort({ id: -1 }).select('id').session(session).lean()
    : await Actor.findOne().sort({ id: -1 }).select('id').session(session).lean();
  const floor = Math.max(kind === 'movie' ? 8000 : 9000, last?.id ?? 0);
  if (!Number.isSafeInteger(floor)) throw new Error('INVALID_CATALOG_ID');
  const counter = await CatalogCounter.findOneAndUpdate({ _id: kind }, { $max: { value: floor } }, { upsert: true, returnDocument: 'after', session });
  if (!counter || !Number.isSafeInteger(counter.value) || counter.value >= Number.MAX_SAFE_INTEGER) throw new Error('CATALOG_ID_EXHAUSTED');
  const next = await CatalogCounter.findOneAndUpdate({ _id: kind }, { $inc: { value: 1 } }, { returnDocument: 'after', session });
  if (!next || !Number.isSafeInteger(next.value)) throw new Error('CATALOG_ID_EXHAUSTED');
  return next.value;
}
