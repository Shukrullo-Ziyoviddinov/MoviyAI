import { Movie } from '../models/Movie.js';
import { Wishlist } from '../models/Wishlist.js';

export async function getWishlistMovieIds(userId: string) {
  const rows = await Wishlist.find({ userId }).select('movieId').lean();
  return rows.map((row) => row.movieId);
}

export async function getWishlistMovies(userId: string) {
  const rows = await Wishlist.find({ userId }).sort({ createdAt: -1 }).lean();
  const ids = rows.map((row) => row.movieId);
  if (ids.length === 0) return [];

  const movies = await Movie.find({ id: { $in: ids } }).lean();
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function isInWishlist(userId: string, movieId: number) {
  const exists = await Wishlist.exists({ userId, movieId });
  return Boolean(exists);
}

export async function toggleWishlist(userId: string, movieId: number) {
  const existing = await Wishlist.findOne({ userId, movieId });
  if (existing) {
    await existing.deleteOne();
    return { saved: false as const, movieId };
  }

  await Wishlist.create({ userId, movieId });
  return { saved: true as const, movieId };
}

export async function removeFromWishlist(userId: string, movieId: number) {
  const result = await Wishlist.deleteOne({ userId, movieId });
  return result.deletedCount > 0;
}
