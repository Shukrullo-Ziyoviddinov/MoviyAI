import type { NextFunction, Request, Response } from 'express';

export type UserRequest = Request & {
  userId: string;
};

export function requireUserId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = String(req.header('x-user-id') ?? '').trim();
  if (!userId) {
    res.status(401).json({ ok: false, error: 'Missing X-User-Id header' });
    return;
  }
  (req as UserRequest).userId = userId;
  next();
}
