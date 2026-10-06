import { Router } from 'express';
import aboutRoutes from './about.routes.js';
import actorRoutes from './actor.routes.js';
import authRoutes from './auth.routes.js';
import movieRoutes from './movie.routes.js';
import privacyRoutes from './privacy.routes.js';
import wishlistRoutes from './wishlist.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/about', aboutRoutes);
router.use('/privacy', privacyRoutes);
router.use('/movies', movieRoutes);
router.use('/actors', actorRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
