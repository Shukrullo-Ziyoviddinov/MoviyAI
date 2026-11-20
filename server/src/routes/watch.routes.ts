import { Router } from 'express';
import { cachedWatchEmbed } from '../services/watch-embed.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const source = typeof req.query.url === 'string' && req.query.url.length < 2000
    ? await cachedWatchEmbed(req.query.url) : null;
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json({ ok: true, source });
}));
export default router;
