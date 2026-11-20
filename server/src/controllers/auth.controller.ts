import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthRequest } from '../middleware/requireAuth.js';
import { loginWithTelegram } from '../services/telegram-auth.service.js';

export async function telegramLogin(req: Request, res: Response) {
  const initData = req.body?.initData;
  if (typeof initData !== 'string' || !initData || initData.length > 16000) {
    res.status(400).json({ ok: false, error: 'Invalid Telegram data' });
    return;
  }
  try { res.json({ ok: true, data: await loginWithTelegram(initData) }); }
  catch (error) {
    const reason = error instanceof Error ? error.message : '';
    const status = reason === 'INVALID_TELEGRAM_DATA' ? 401 : reason === 'TELEGRAM_ACCOUNT_CONFLICT' ? 409 : 503;
    res.status(status).json({ ok: false, error: 'Telegram orqali kirib bo‘lmadi. Qayta urining yoki ilovani bot orqali qayta oching.' });
  }
}

export async function googleLogin(req: Request, res: Response) {
  const idToken = String(req.body?.idToken ?? '').trim();
  if (!idToken) {
    res.status(400).json({ ok: false, error: 'idToken is required' });
    return;
  }

  try {
    const result = await authService.loginWithGoogleIdToken(idToken);
    res.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google login failed';
    res.status(401).json({ ok: false, error: message });
  }
}

export async function me(req: Request, res: Response) {
  const profile = (req as AuthRequest).profile;
  const token = authService.signAccessToken(profile);
  res.json({ ok: true, data: profile, token });
}

export async function dismissSearchGuide(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId;
  const profile = await authService.dismissSearchGuide(userId);
  if (!profile) {
    res.status(404).json({ ok: false, error: 'Profile not found' });
    return;
  }
  res.json({ ok: true, data: profile });
}

export async function dismissChatGuide(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId;
  const profile = await authService.dismissChatGuide(userId);
  if (!profile) {
    res.status(404).json({ ok: false, error: 'Profile not found' });
    return;
  }
  res.json({ ok: true, data: profile });
}
