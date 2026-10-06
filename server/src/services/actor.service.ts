import { Actor } from '../models/Actor.js';

export async function getAllActors() {
  return Actor.find().sort({ id: 1 }).lean();
}

export async function getActorById(id: number) {
  return Actor.findOne({ id }).lean();
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
