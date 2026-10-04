import { Router } from 'express';
import aboutRoutes from './about.routes.js';
import privacyRoutes from './privacy.routes.js';

const router = Router();

router.use('/about', aboutRoutes);
router.use('/privacy', privacyRoutes);

export default router;
