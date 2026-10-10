import { Router } from 'express';
import * as bannerController from '../controllers/banner.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(bannerController.listBanners));
router.post('/', bannerController.uploadBannerImage, asyncHandler(bannerController.createBanner));
router.patch('/:id', bannerController.uploadBannerImage, asyncHandler(bannerController.updateBanner));
router.delete('/:id', asyncHandler(bannerController.removeBanner));

export default router;
