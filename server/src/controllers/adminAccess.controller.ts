import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import * as adminAccessService from '../services/adminAccess.service.js';
import * as r2Service from '../services/r2.service.js';

function text(value: unknown) {
  return String(value ?? '').trim();
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export function uploadAdminImage(req: Request, res: Response, next: NextFunction) {
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

function imageName(file: Express.Multer.File) {
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  return `admin-${Date.now()}.${ext}`;
}

export async function enterAdmin(req: Request, res: Response) {
  if (!env.adminPassword) {
    res.status(500).json({ ok: false, error: 'Admin paroli sozlanmagan' });
    return;
  }

  const name = text(req.body?.name);
  const phone = text(req.body?.phone);
  const password = text(req.body?.password);
  const file = req.file;
  if (!name || !phone || !password || !file) {
    res.status(400).json({ ok: false, error: 'Ism, raqam, rasm va parol kerak' });
    return;
  }
  if (!adminAccessService.adminPasswordMatches(password)) {
    res.status(401).json({ ok: false, error: 'Parol noto‘g‘ri' });
    return;
  }

  const image = await r2Service.putImage('adminimg', imageName(file), file.buffer, file.mimetype);
  const account = await adminAccessService.saveAdminAccount(name, phone, image.path);
  const token = adminAccessService.signAdminSession(name, image.path);
  res.status(201).json({ ok: true, data: { token, account } });
}

export async function adminSession(req: Request, res: Response) {
  const header = String(req.headers.authorization ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? adminAccessService.readAdminSession(token) : null;
  if (!session) {
    res.status(401).json({ ok: false, error: 'Sessiya yo‘q' });
    return;
  }
  res.json({ ok: true, data: { name: session.name, photo: session.photo } });
}
