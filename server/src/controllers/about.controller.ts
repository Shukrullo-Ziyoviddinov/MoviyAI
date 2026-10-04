import type { Request, Response } from 'express';
import * as aboutService from '../services/about.service.js';

export async function getAbout(_req: Request, res: Response) {
  const doc = await aboutService.getAboutBySlug('about');
  if (!doc) {
    res.status(404).json({ ok: false, error: 'About content not found' });
    return;
  }
  res.json({ ok: true, data: doc });
}

export async function listAbouts(_req: Request, res: Response) {
  const docs = await aboutService.getAllAbouts();
  res.json({ ok: true, data: docs });
}
