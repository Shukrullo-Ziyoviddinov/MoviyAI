import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/requireAuth.js';
import * as wishlistService from '../services/wishlist.service.js';

function userIdOf(req: Request) {
  return (req as AuthRequest).userId;
}

export async function listWishlist(req: Request, res: Response) {
  const movies = await wishlistService.getWishlistMovies(userIdOf(req));
  res.json({ ok: true, data: movies });
}

export async function listWishlistIds(req: Request, res: Response) {
  const ids = await wishlistService.getWishlistMovieIds(userIdOf(req));
  res.json({ ok: true, data: ids });
}

export async function toggleWishlist(req: Request, res: Response) {
  const movieId = Number(req.body?.movieId);
  if (!Number.isFinite(movieId)) {
    res.status(400).json({ ok: false, error: 'Invalid movieId' });
    return;
  }

  const result = await wishlistService.toggleWishlist(userIdOf(req), movieId);
  res.json({ ok: true, data: result });
}

export async function removeWishlistItem(req: Request, res: Response) {
  const movieId = Number(req.params.movieId);
  if (!Number.isFinite(movieId)) {
    res.status(400).json({ ok: false, error: 'Invalid movieId' });
    return;
  }

  const removed = await wishlistService.removeFromWishlist(
    userIdOf(req),
    movieId
  );
  if (!removed) {
    res.status(404).json({ ok: false, error: 'Wishlist item not found' });
    return;
  }

  res.json({ ok: true, data: { saved: false, movieId } });
}
