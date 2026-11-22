import type { Request, Response } from 'express';
import { movieListingService } from '../services/movie-listing.service.js';
import { parseListingQuery } from '../validators/movie-listing.validator.js';
import { invalidListing } from '../utils/movie-listing-cursor.js';

export async function listHomeSections(req: Request, res: Response) {
  if (Object.keys(req.query).length) invalidListing('Home sections do not accept query parameters');
  res.json({ ok: true, data: await movieListingService.home() });
}
export async function listMovieSection(req: Request, res: Response) {
  const query = parseListingQuery(req.params.categoryName, req.query);
  res.json({ ok: true, data: await movieListingService.page(query) });
}
