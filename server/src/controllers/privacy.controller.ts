import type { Request, Response } from 'express';
import * as privacyService from '../services/privacy.service.js';

export async function getPrivacy(_req: Request, res: Response) {
  const doc = await privacyService.getPrivacyBySlug('privacy');
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Privacy content not found' });
    return;
  }
  res.json({ ok: true, data: doc });
}

export async function listPrivacies(_req: Request, res: Response) {
  const docs = await privacyService.getAllPrivacies();
  res.json({ ok: true, data: docs });
}
