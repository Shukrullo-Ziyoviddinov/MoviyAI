import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    ok: false,
    error: message,
  });
}
