import { Profile } from '../models/Profile.js';

/** Install replacement uniqueness constraints before removing legacy indexes
 * that treat every missing Google/email field as the same null value. */
export async function ensureProfileIdentityIndexes() {
  await Profile.createCollection();
  await Profile.createIndexes();
  const indexes = await Profile.collection.indexes();
  for (const index of indexes) {
    const fields = Object.keys(index.key);
    if (['googleId_1', 'email_1'].includes(index.name ?? '') && index.unique && !index.sparse && !index.partialFilterExpression
      && fields.length === 1 && ['googleId', 'email'].includes(fields[0])) {
      try { await Profile.collection.dropIndex(index.name!); }
      catch (error) { if ((error as { code?: number }).code !== 27) throw error; }
    }
  }
}
