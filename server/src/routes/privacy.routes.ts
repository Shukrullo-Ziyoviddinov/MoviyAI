import { Router } from 'express';
import * as privacyController from '../controllers/privacy.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(privacyController.getPrivacy));
router.get('/all', asyncHandler(privacyController.listPrivacies));

export default router;
