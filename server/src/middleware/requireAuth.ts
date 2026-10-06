import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthProfile } from '../services/auth.service.js';

export type AuthRequest = Request & {
  userId: string;
  profile: AuthProfile;
};

function readBearer(req: Request) {
  const header = String(req.header('authorization') ?? '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ ok: false, error: 'Login required' });
    return;
  }

  const session = authService.verifyAccessToken(token);
  if (!session) {
    res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    return;
  }

  const profile = await authService.getProfileById(session.id);
  if (!profile) {
    res.status(401).json({ ok: false, error: 'Profile not found' });
    return;
  }

  (req as AuthRequest).userId = profile.id;
  (req as AuthRequest).profile = profile;
  next();
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = readBearer(req);
  if (!token) {
    next();
    return;
  }

  const session = authService.verifyAccessToken(token);
  if (!session) {
    next();
    return;
  }

  const profile = await authService.getProfileById(session.id);
  if (profile) {
    (req as AuthRequest).userId = profile.id;
    (req as AuthRequest).profile = profile;
  }
  next();
}
