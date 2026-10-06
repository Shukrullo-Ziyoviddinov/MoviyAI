import type { Request, Response } from 'express';
import * as actorService from '../services/actor.service.js';
import * as movieService from '../services/movie.service.js';

export async function listActors(_req: Request, res: Response) {
  const docs = await actorService.getAllActors();
  res.json({ ok: true, data: docs });
}

export async function getActor(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid actor id' });
    return;
  }

  const doc = await actorService.getActorById(id);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Actor not found' });
    return;
  }

  const movies = await movieService.getMoviesByActorId(id);
  res.json({ ok: true, data: { ...doc, movies } });
}
