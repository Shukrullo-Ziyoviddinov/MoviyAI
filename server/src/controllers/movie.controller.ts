import type { Request, Response } from 'express';
import type { UserRequest } from '../middleware/requireUserId.js';
import * as movieService from '../services/movie.service.js';
import * as movieCommentService from '../services/movieComment.service.js';
import * as movieReactionService from '../services/movieReaction.service.js';
import * as similarTrailersService from '../services/similarTrailers.service.js';

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

  const userId = String(req.header('x-user-id') ?? '').trim();
  let userReaction: 'like' | 'dislike' | null = null;
  if (userId) {
    userReaction = await movieReactionService.getUserReaction(userId, id);
  }
  const commentCount = await movieCommentService.countComments(id);

  res.json({ ok: true, data: { ...doc, userReaction, commentCount } });
}

export async function listSimilarTrailers(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const limitRaw = Number(req.query.limit ?? 12);
  const limit = Number.isFinite(limitRaw) ? Math.min(30, Math.max(1, limitRaw)) : 12;
  const docs = await similarTrailersService.getSimilarTrailers(id, limit);
  if (!docs) {
    res.status(404).json({ ok: false, error: 'Movie not found' });
    return;
  }

  res.json({ ok: true, data: docs });
}

export async function toggleReaction(req: Request, res: Response) {
  const id = Number(req.params.id);
  const type = String(req.body?.type ?? '').trim();
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }
  if (type !== 'like' && type !== 'dislike') {
    res.status(400).json({ ok: false, error: 'type must be like or dislike' });
    return;
  }

  const userId = (req as UserRequest).userId;
  const result = await movieReactionService.toggleMovieReaction(
    userId,
    id,
    type
  );
  if (!result) {
    res.status(404).json({ ok: false, error: 'Movie not found' });
    return;
  }

  res.json({ ok: true, data: result });
}

export async function listComments(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const movie = await movieService.getMovieById(id);
  if (!movie) {
    res.status(404).json({ ok: false, error: 'Movie not found' });
    return;
  }

  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
  const comments = await movieCommentService.listComments(id, limit);
  const commentCount = await movieCommentService.countComments(id);

  res.json({ ok: true, data: { comments, commentCount } });
}

export async function createComment(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const userId = (req as UserRequest).userId;
  try {
    const comment = await movieCommentService.createComment(
      userId,
      id,
      String(req.body?.text ?? '')
    );
    if (!comment) {
      res.status(404).json({ ok: false, error: 'Movie not found' });
      return;
    }
    const commentCount = await movieCommentService.countComments(id);
    res.status(201).json({ ok: true, data: { comment, commentCount } });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'EMPTY_TEXT') {
      res.status(400).json({ ok: false, error: 'Comment text is required' });
      return;
    }
    if (code === 'TEXT_TOO_LONG') {
      res.status(400).json({ ok: false, error: 'Comment is too long' });
      return;
    }
    throw err;
  }
}
