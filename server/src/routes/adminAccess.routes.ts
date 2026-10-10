import { Router } from 'express';
import * as adminAccessController from '../controllers/adminAccess.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/', adminAccessController.uploadAdminImage, asyncHandler(adminAccessController.enterAdmin));
router.get('/session', asyncHandler(adminAccessController.adminSession));

export default router;
