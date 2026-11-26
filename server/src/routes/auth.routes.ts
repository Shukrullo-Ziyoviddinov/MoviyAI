import { Router } from 'express';
import { createKinoSession } from '../services/kino-sso.service.js';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/google', asyncHandler(authController.googleLogin));
router.post('/telegram', asyncHandler(authController.telegramLogin));
router.post('/kino-session', requireAuth, asyncHandler(createKinoSession));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post(
  '/search-guide/dismiss',
  requireAuth,
  asyncHandler(authController.dismissSearchGuide)
);
router.post(
  '/chat-guide/dismiss',
  requireAuth,
  asyncHandler(authController.dismissChatGuide)
);

export default router;
