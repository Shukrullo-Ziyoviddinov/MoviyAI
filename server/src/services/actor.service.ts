import { Actor } from '../models/Actor.js';
import { Movie } from '../models/Movie.js';

export async function getAllActors() {
  return Actor.find().sort({ id: 1 }).lean();
}

export async function getActorById(id: number) {
  return Actor.findOne({ id }).lean();
}

export async function createActor(input: Record<string, unknown>) {
  const last = await Actor.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const lastId = typeof last?.id === 'number' ? last.id : 9000;
  const doc = await Actor.create({ ...input, id: lastId + 1 });
  return doc.toObject();
}

export async function updateActor(id: number, input: Record<string, unknown>) {
  return Actor.findOneAndUpdate({ id }, { $set: input }, { returnDocument: 'after' }).lean();
}

export async function deleteActor(id: number) {
  const doc = await Actor.findOneAndDelete({ id }).lean();
  if (!doc) return null;
  await Movie.updateMany({ actorIds: id }, { $pull: { actorIds: id } });
  return doc;
}

export async function getActorsByIds(ids: number[]) {
  if (!ids.length) return [];
  const docs = await Actor.find({ id: { $in: ids } }).lean();
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  return ids
    .map((id) => byId.get(id))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));
}

export async function upsertActors(actors: Record<string, unknown>[]) {
  const results = [];
  for (const actor of actors) {
    const id = Number(actor.id);
    const doc = await Actor.findOneAndUpdate(
      { id },
      { $set: actor },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
