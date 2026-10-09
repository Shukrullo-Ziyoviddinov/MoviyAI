import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import * as actorService from '../services/actor.service.js';
import * as movieService from '../services/movie.service.js';
import * as r2Service from '../services/r2.service.js';

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

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export function uploadActorImage(req: Request, res: Response, next: NextFunction) {
  imageUpload.single('image')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const code = err instanceof Error ? err.message : '';
    const multerCode = (err as { code?: string }).code;
    if (code === 'UNSUPPORTED_TYPE') {
      res.status(400).json({ ok: false, error: 'Rasm faqat jpeg, png yoki webp bo‘lishi kerak' });
      return;
    }
    if (multerCode === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ ok: false, error: 'Rasm hajmi katta' });
      return;
    }
    next(err);
  });
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function imageName(file: Express.Multer.File) {
  const raw = (file.originalname.split(/[/\\]/).pop() ?? '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (/^[a-zA-Z0-9._-]+$/.test(raw) && raw.includes('.')) return raw;
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  return `actor-${Date.now()}.${ext}`;
}

export async function createActor(req: Request, res: Response) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text(req.body?.data) || '{}') as Record<string, unknown>;
  } catch {
    res.status(400).json({ ok: false, error: 'Ma’lumot formati noto‘g‘ri' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ ok: false, error: 'Rasm kerak' });
    return;
  }

  const actorName = text(payload.actorName);
  const about = (payload.actorAbout ?? {}) as Record<string, unknown>;
  const aboutUz = text(about.uz);
  const aboutRu = text(about.ru);
  if (!actorName || !aboutUz || !aboutRu) {
    res.status(400).json({ ok: false, error: 'Ism va ma’lumot to‘liq emas' });
    return;
  }

  let image;
  try {
    image = await r2Service.putImage('actorimg', imageName(file), file.buffer, file.mimetype);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'INVALID_FILENAME') {
      res.status(400).json({ ok: false, error: 'Rasm nomi noto‘g‘ri' });
      return;
    }
    throw err;
  }

  const doc = await actorService.createActor({
    actorName,
    actorImg: image.path,
    actorAbout: { uz: aboutUz, ru: aboutRu },
  });

  res.status(201).json({ ok: true, data: doc });
}

export async function updateActor(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid actor id' });
    return;
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text(req.body?.data) || '{}') as Record<string, unknown>;
  } catch {
    res.status(400).json({ ok: false, error: 'Ma’lumot formati noto‘g‘ri' });
    return;
  }

  const actorName = text(payload.actorName);
  const about = (payload.actorAbout ?? {}) as Record<string, unknown>;
  const aboutUz = text(about.uz);
  const aboutRu = text(about.ru);
  if (!actorName || !aboutUz || !aboutRu) {
    res.status(400).json({ ok: false, error: 'Ism va ma’lumot to‘liq emas' });
    return;
  }

  const input: Record<string, unknown> = {
    actorName,
    actorAbout: { uz: aboutUz, ru: aboutRu },
  };

  if (req.file) {
    try {
      const image = await r2Service.putImage('actorimg', imageName(req.file), req.file.buffer, req.file.mimetype);
      input.actorImg = image.path;
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'INVALID_FILENAME') {
        res.status(400).json({ ok: false, error: 'Rasm nomi noto‘g‘ri' });
        return;
      }
      throw err;
    }
  }

  const doc = await actorService.updateActor(id, input);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Actor not found' });
    return;
  }
  res.json({ ok: true, data: doc });
}

export async function removeActor(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, error: 'Invalid actor id' });
    return;
  }
  const doc = await actorService.deleteActor(id);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Actor not found' });
    return;
  }
  res.json({ ok: true, data: doc });
}
