import type { Request, Response } from 'express';
import multer from 'multer';
import * as r2Service from '../services/r2.service.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export const uploadImageMiddleware = upload.single('file');

export async function getImage(req: Request, res: Response) {
  const folder = String(req.params.folder ?? '');
  const fileName = String(req.params.fileName ?? '');
  if (!r2Service.isImageFolder(folder)) {
    res.status(404).json({ ok: false, error: 'Image not found' });
    return;
  }
  const image = await r2Service.getImage(folder, fileName);
  if (!image) {
    res.status(404).json({ ok: false, error: 'Image not found' });
    return;
  }
  res.setHeader('Content-Type', image.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(image.body);
}

export async function uploadImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ ok: false, error: 'file is required' });
    return;
  }
  const folder = String(req.body?.folder ?? '').trim();
  if (!r2Service.isImageFolder(folder)) {
    res.status(400).json({ ok: false, error: 'folder must be movieimg, actorimg, or banner' });
    return;
  }
  try {
    const saved = await r2Service.putImage(
      folder,
      file.originalname,
      file.buffer,
      file.mimetype
    );
    res.status(201).json({ ok: true, data: saved });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'INVALID_FILENAME') {
      res.status(400).json({ ok: false, error: 'Invalid file name' });
      return;
    }
    throw err;
  }
}
