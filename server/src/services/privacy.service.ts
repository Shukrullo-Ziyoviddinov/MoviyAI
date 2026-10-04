import { Privacy } from '../models/Privacy.js';

export async function getPrivacyBySlug(slug = 'privacy') {
  return Privacy.findOne({ slug }).lean();
}

export async function getAllPrivacies() {
  return Privacy.find().sort({ updatedAt: -1 }).lean();
}

export async function upsertPrivacy(payload: Record<string, unknown>) {
  const slug = String(payload.slug ?? 'privacy');
  return Privacy.findOneAndUpdate(
    { slug },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
}
