import { About } from '../models/About.js';

export async function getAboutBySlug(slug = 'about') {
  return About.findOne({ slug }).lean();
}

export async function getAllAbouts() {
  return About.find().sort({ updatedAt: -1 }).lean();
}

export async function upsertAbout(payload: Record<string, unknown>) {
  const slug = String(payload.slug ?? 'about');
  return About.findOneAndUpdate(
    { slug },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
}
