import { Router } from 'express';
import aboutRoutes from './about.routes.js';
import movieRoutes from './movie.routes.js';
import privacyRoutes from './privacy.routes.js';

const router = Router();

router.use('/about', aboutRoutes);
router.use('/privacy', privacyRoutes);
router.use('/movies', movieRoutes);

export default router;
