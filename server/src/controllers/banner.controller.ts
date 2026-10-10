import type { Request, Response } from 'express';
import * as bannerService from '../services/banner.service.js';

export async function listBanners(_req: Request, res: Response) {
  const docs = await bannerService.getAllBanners();
  res.json({ ok: true, data: docs });
}
