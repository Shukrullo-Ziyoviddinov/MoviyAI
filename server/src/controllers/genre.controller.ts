import type { Request, Response } from 'express';
import * as genreService from '../services/genre.service.js';

export async function listGenres(_req: Request, res: Response) {
  const docs = await genreService.getAllGenres();
  res.json({ ok: true, data: docs });
}
