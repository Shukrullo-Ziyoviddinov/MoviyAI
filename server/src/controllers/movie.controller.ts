import type { Request, Response } from 'express';
import * as movieService from '../services/movie.service.js';

export async function listMovies(_req: Request, res: Response) {
  const docs = await movieService.getAllMovies();
  res.json({ ok: true, data: docs });
}

export async function getMovie(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const doc = await movieService.getMovieById(id);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Movie not found' });
    return;
  }

  res.json({ ok: true, data: doc });
}
