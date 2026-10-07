import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google', asyncHandler(authController.googleLogin));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post(
  '/search-guide/dismiss',
  requireAuth,
  asyncHandler(authController.dismissSearchGuide)
);

export default router;
