import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import * as adminAccessService from '../services/adminAccess.service.js';

function text(value: unknown) {
  return String(value ?? '').trim();
}

export async function enterAdmin(req: Request, res: Response) {
  if (!env.adminPassword) {
    res.status(500).json({ ok: false, error: 'Admin paroli sozlanmagan' });
    return;
  }

  const name = text(req.body?.name);
  const phone = text(req.body?.phone);
  const password = text(req.body?.password);
  if (!name || !phone || !password) {
    res.status(400).json({ ok: false, error: 'Ism, raqam va parol kerak' });
    return;
  }
  if (!adminAccessService.adminPasswordMatches(password)) {
    res.status(401).json({ ok: false, error: 'Parol noto‘g‘ri' });
    return;
  }

  const account = await adminAccessService.saveAdminAccount(name, phone);
  const token = adminAccessService.signAdminSession(name);
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
  res.json({ ok: true, data: { name: session.name } });
}
