import { Banner } from '../models/Banner.js';

export type BannerInput = {
  img: string;
  movieId: number[];
};

export async function getAllBanners() {
  return Banner.find().sort({ createdAt: 1 }).lean();
}

export async function upsertBanners(items: BannerInput[]) {
  const results = [];
  for (const item of items) {
    const img = String(item.img ?? '').trim();
    if (!img) continue;
    const movieId = (Array.isArray(item.movieId) ? item.movieId : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    const doc = await Banner.findOneAndUpdate(
      { img },
      { $set: { img, movieId } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
