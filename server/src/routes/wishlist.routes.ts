import { Router } from 'express';
import * as wishlistController from '../controllers/wishlist.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(wishlistController.listWishlist));
router.get('/ids', asyncHandler(wishlistController.listWishlistIds));
router.post('/toggle', asyncHandler(wishlistController.toggleWishlist));
router.delete('/:movieId', asyncHandler(wishlistController.removeWishlistItem));

export default router;
