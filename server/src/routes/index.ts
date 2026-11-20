import { Router } from 'express';
import { cachedWatchEmbed } from '../services/watch-embed.service.js';
import aiRoutes from '../ai/routes/ai.routes.js';
import aboutRoutes from './about.routes.js';
import actorRoutes from './actor.routes.js';
import adminAccessRoutes from './adminAccess.routes.js';
import bannerRoutes from './banner.routes.js';
import countryRoutes from './country.routes.js';
import authRoutes from './auth.routes.js';
import genreRoutes from './genre.routes.js';
import mediaRoutes from './media.routes.js';
import movieRoutes from './movie.routes.js';
import privacyRoutes from './privacy.routes.js';
import wishlistRoutes from './wishlist.routes.js';

const router = Router();
router.get('/watch-embed', async (req, res) => {
  const result = typeof req.query.url === 'string' && req.query.url.length < 2000
    ? await cachedWatchEmbed(req.query.url) : null;
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json({ ok: true, source: result });
});

router.use('/ai', aiRoutes);

router.use('/auth', authRoutes);
router.use('/about', aboutRoutes);
router.use('/privacy', privacyRoutes);
router.use('/media', mediaRoutes);
router.use('/movies', movieRoutes);
router.use('/genres', genreRoutes);
router.use('/countries', countryRoutes);
router.use('/actors', actorRoutes);
router.use('/admin-access', adminAccessRoutes);
router.use('/banners', bannerRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
