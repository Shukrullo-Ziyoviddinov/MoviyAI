import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../middleware/requireAuth.js';

export async function createKinoSession(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  const secret = process.env.MOVIYAI_SSO_SECRET;
  const kinoApi = process.env.KINO_OLAMI_API_URL;
  if (!secret || Buffer.byteLength(secret) < 32 || !kinoApi) {
    res.status(503).json({ ok: false, error: 'Kino Olami session is unavailable' });
    return;
  }

  const { profile } = req as AuthRequest;
  const assertion = jwt.sign({ name: profile.name }, secret, {
    algorithm: 'HS256',
    issuer: 'moviyai',
    audience: 'kino-olami',
    subject: profile.id,
    expiresIn: '60s',
  });
  try {
    const endpoint = new URL('/api/auth/moviy/exchange', kinoApi);
    if (process.env.NODE_ENV === 'production' && endpoint.protocol !== 'https:') {
      throw new Error('Kino Olami exchange requires HTTPS');
    }
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assertion }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    const result = await upstream.json() as { data?: { token?: string } };
    if (!upstream.ok || typeof result.data?.token !== 'string') throw new Error('Kino Olami exchange failed');
    res.json({ ok: true, data: { token: result.data.token } });
  } catch {
    res.status(502).json({ ok: false, error: 'Kino Olami session is unavailable' });
  }
}