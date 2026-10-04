import { Router } from 'express';
import * as aboutController from '../controllers/about.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(aboutController.getAbout));
router.get('/all', asyncHandler(aboutController.listAbouts));

export default router;
