import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { reserveSearch, analyzeSearch } from './media-search.service.js';
import { searchId, searchUpload } from './media-search.validator.js';
import { chatFailureCode } from '../ai/types/chat-progress.types.js';
import { listSearchHistory, readSearchHistory, deleteSearchHistory } from './media-search-history.service.js';

const router = Router();
const analysisLimit = rateLimit({ windowMs: 60000, limit: 12, standardHeaders: true, legacyHeaders: false, keyGenerator: req => (req as AuthRequest).userId! });
router.use(requireAuth, rateLimit({ windowMs: 60000, limit: 90, standardHeaders: true, legacyHeaders: false, keyGenerator: req => (req as AuthRequest).userId! }));
router.get('/history', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store').json({ ok: true, data: await listSearchHistory((req as AuthRequest).userId!, req.query.cursor) });
}));
router.get('/history/:id', asyncHandler(async (req, res) => {
  const id = searchId.safeParse(req.params.id); if (!id.success) { res.status(400).json({ ok: false }); return; }
  res.set('Cache-Control', 'private, no-store').json({ ok: true, data: await readSearchHistory((req as AuthRequest).userId!, id.data) });
}));
router.delete('/history/:id', asyncHandler(async (req, res) => {
  const id = searchId.safeParse(req.params.id); if (!id.success) { res.status(400).json({ ok: false }); return; }
  const result = await deleteSearchHistory((req as AuthRequest).userId!, id.data);
  res.set('Cache-Control', 'no-store').status(result.pending ? 202 : 200).json({ ok: true, data: result });
}));
router.post('/uploads', analysisLimit, asyncHandler(async (req, res) => {
  const input = searchUpload.safeParse(req.body);
  if (!input.success) { res.status(400).json({ ok: false, error: 'Invalid media metadata' }); return; }
  res.set('Cache-Control', 'no-store').json({ ok: true, data: await reserveSearch((req as AuthRequest).userId!, input.data) });
}));
router.post('/:id/analyze', analysisLimit, asyncHandler(async (req, res) => {
  const id = searchId.safeParse(req.params.id), body = z.object({ language: z.enum(['uz', 'ru', 'en']) }).strict().safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ ok: false }); return; }
  const abort = new AbortController();
  res.once('close', () => { if (!res.writableEnded) abort.abort(); });
  res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const write = (event: unknown) => { if (!res.destroyed && !res.writableEnded) { res.write(`data: ${JSON.stringify(event)}\n\n`); res.flush?.(); } };
  const heartbeat = setInterval(() => { if (!res.destroyed && !res.writableEnded) { res.write(': keepalive\n\n'); res.flush?.(); } }, 15000);
  try {
    const movie = await analyzeSearch((req as AuthRequest).userId!, id.data, body.data.language, abort.signal, stage => write({ type: 'progress', stage }));
    write({ type: 'done', movie });
  } catch (error) { write({ type: 'error', code: (error as { status?: number }).status === 429 ? 'rate_limited' : chatFailureCode(error) }); }
  finally { clearInterval(heartbeat); res.end(); }
}));
export default router;
