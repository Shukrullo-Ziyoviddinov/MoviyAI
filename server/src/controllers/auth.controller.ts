import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthRequest } from '../middleware/requireAuth.js';

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
  res.json({ ok: true, data: profile });
}
