import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import * as bannerService from '../services/banner.service.js';
import * as movieService from '../services/movie.service.js';
import * as r2Service from '../services/r2.service.js';

export async function listBanners(_req: Request, res: Response) {
  const docs = await bannerService.getAllBanners();
  res.json({ ok: true, data: docs });
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export function uploadBannerImage(req: Request, res: Response, next: NextFunction) {
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
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  return `banner-${Date.now()}.${ext}`;
}

export async function createBanner(req: Request, res: Response) {
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

  const rawIds = Array.isArray(payload.movieId) ? payload.movieId : [payload.movieId];
  const movieId = rawIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (movieId.length === 0) {
    res.status(400).json({ ok: false, error: 'Kino biriktirilishi kerak' });
    return;
  }

  const movie = await movieService.getMovieById(movieId[0]);
  if (!movie) {
    res.status(404).json({ ok: false, error: 'Kino topilmadi' });
    return;
  }

  let image;
  try {
    image = await r2Service.putImage('banner', imageName(file), file.buffer, file.mimetype);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'INVALID_FILENAME') {
      res.status(400).json({ ok: false, error: 'Rasm nomi noto‘g‘ri' });
      return;
    }
    throw err;
  }

  const doc = await bannerService.createBanner({
    img: image.path,
    movieId: [movieId[0]],
  });
  res.status(201).json({ ok: true, data: doc });
}
