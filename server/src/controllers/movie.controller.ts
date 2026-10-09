import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import type { AuthRequest } from '../middleware/requireAuth.js';
import * as r2Service from '../services/r2.service.js';
import * as actorService from '../services/actor.service.js';
import * as movieService from '../services/movie.service.js';
import * as movieCommentService from '../services/movieComment.service.js';
import * as movieReactionService from '../services/movieReaction.service.js';
import * as similarTrailersService from '../services/similarTrailers.service.js';
import * as similarMoviesService from '../services/similarMovies.service.js';

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

  const userId = (req as AuthRequest).userId;
  let userReaction: 'like' | 'dislike' | null = null;
  if (userId) {
    userReaction = await movieReactionService.getUserReaction(userId, id);
  }
  const commentCount = await movieCommentService.countComments(id);
  const actorIds = Array.isArray(doc.actorIds)
    ? doc.actorIds.map(Number).filter(Number.isFinite)
    : [];
  const actors = await actorService.getActorsByIds(actorIds);

  res.json({
    ok: true,
    data: { ...doc, actors, userReaction, commentCount },
  });
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

export async function listSimilarMovies(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const limitRaw = Number(req.query.limit ?? 16);
  const limit = Number.isFinite(limitRaw) ? Math.min(40, Math.max(1, limitRaw)) : 16;
  const docs = await similarMoviesService.getSimilarMovies(id, limit);
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

  const userId = (req as AuthRequest).userId;
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

export async function listCommentReplies(req: Request, res: Response) {
  const id = Number(req.params.id);
  const commentId = String(req.params.commentId ?? '').trim();
  if (!Number.isFinite(id) || !commentId) {
    res.status(400).json({ ok: false, error: 'Invalid params' });
    return;
  }

  const skipRaw = Number(req.query.skip ?? 0);
  const limitRaw = Number(req.query.limit ?? 5);
  const skip = Number.isFinite(skipRaw) ? skipRaw : 0;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 5;

  const result = await movieCommentService.listReplies(id, commentId, skip, limit);
  if (!result) {
    res.status(404).json({ ok: false, error: 'Comment not found' });
    return;
  }

  res.json({ ok: true, data: result });
}

export async function createComment(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid movie id' });
    return;
  }

  const userId = (req as AuthRequest).userId;
  const profile = (req as AuthRequest).profile;
  try {
    const comment = await movieCommentService.createComment(
      userId,
      id,
      String(req.body?.text ?? ''),
      req.body?.parentId ?? null,
      {
        authorName: profile.name,
        authorPicture: profile.picture,
      }
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
    if (code === 'INVALID_PARENT') {
      res.status(400).json({ ok: false, error: 'Invalid parent comment' });
      return;
    }
    throw err;
  }
}

const posterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export function uploadPoster(req: Request, res: Response, next: NextFunction) {
  posterUpload.single('poster')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const code = err instanceof Error ? err.message : '';
    const multerCode = (err as { code?: string }).code;
    if (code === 'UNSUPPORTED_TYPE') {
      res.status(400).json({ ok: false, error: 'Poster faqat jpeg, png yoki webp bo‘lishi kerak' });
      return;
    }
    if (multerCode === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ ok: false, error: 'Poster hajmi katta' });
      return;
    }
    next(err);
  });
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function words(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function numbers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((item) => Number.isFinite(item));
}

function amount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function readDescription(value: unknown, label: string) {
  const row = (value ?? {}) as Record<string, unknown>;
  const body = text(row.text);
  const country = text(row.country);
  const director = text(row.director);
  const year = amount(row.year);
  const duration = amount(row.duration);
  if (!body || !country || !director || !Number.isFinite(year) || !Number.isFinite(duration)) {
    return { error: `${label} to‘liq emas` as const };
  }
  return { value: { text: body, year, country, duration, director } };
}

function posterName(file: Express.Multer.File) {
  const raw = (file.originalname.split(/[/\\]/).pop() ?? '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (/^[a-zA-Z0-9._-]+$/.test(raw) && raw.includes('.')) return raw;
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  return `poster-${Date.now()}.${ext}`;
}

export async function createMovie(req: Request, res: Response) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text(req.body?.data) || '{}') as Record<string, unknown>;
  } catch {
    res.status(400).json({ ok: false, error: 'Ma’lumot formati noto‘g‘ri' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ ok: false, error: 'Poster kerak' });
    return;
  }

  const title = (payload.title ?? {}) as Record<string, unknown>;
  const titleUz = text(title.uz);
  const titleRu = text(title.ru);
  const categoryName = text(payload.categoryName);
  if (!categoryName || !titleUz || !titleRu) {
    res.status(400).json({ ok: false, error: 'Bo‘lim va kino nomi kerak' });
    return;
  }

  const description = (payload.description ?? {}) as Record<string, unknown>;
  const uz = readDescription(description.uz, 'O‘zbekcha ma’lumot');
  const ru = readDescription(description.ru, 'Ruscha ma’lumot');
  if ('error' in uz) {
    res.status(400).json({ ok: false, error: uz.error });
    return;
  }
  if ('error' in ru) {
    res.status(400).json({ ok: false, error: ru.error });
    return;
  }

  const specs = (payload.specs ?? {}) as Record<string, unknown>;
  const specsYear = amount(specs.year);
  const specsDuration = amount(specs.duration);
  const ageRating = text(specs.ageRating);
  if (!Number.isFinite(specsYear) || !Number.isFinite(specsDuration) || !ageRating) {
    res.status(400).json({ ok: false, error: 'Specs maydonlari to‘liq emas' });
    return;
  }

  let poster;
  try {
    poster = await r2Service.putImage('movieimg', posterName(file), file.buffer, file.mimetype);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'INVALID_FILENAME') {
      res.status(400).json({ ok: false, error: 'Poster nomi noto‘g‘ri' });
      return;
    }
    throw err;
  }

  const doc = await movieService.createMovie({
    categoryName,
    title: { uz: titleUz, ru: titleRu },
    homeImgPoster: poster.path,
    ratingImdb: Number.isFinite(amount(payload.ratingImdb)) ? amount(payload.ratingImdb) : 0,
    ratingKinopoisk: Number.isFinite(amount(payload.ratingKinopoisk)) ? amount(payload.ratingKinopoisk) : 0,
    genre: {
      uz: words((payload.genre as { uz?: unknown } | undefined)?.uz),
      ru: words((payload.genre as { ru?: unknown } | undefined)?.ru),
    },
    description: { uz: uz.value, ru: ru.value },
    trailers: text(payload.trailers),
    watchUrl: text(payload.watchUrl),
    typeCategory: words(payload.typeCategory),
    filterCountry: text(payload.filterCountry),
    filterGenre: words(payload.filterGenre),
    like: text(payload.like) || '0',
    dislike: text(payload.dislike) || '0',
    specs: {
      duration: specsDuration,
      ageRating,
      year: specsYear,
      countries: words(specs.countries),
    },
    franchiseMovieIds: numbers(payload.franchiseMovieIds),
    actorIds: numbers(payload.actorIds),
  });

  res.status(201).json({ ok: true, data: doc });
}
