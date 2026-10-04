import { Router } from 'express';
import * as wishlistController from '../controllers/wishlist.controller.js';
import { requireUserId } from '../middleware/requireUserId.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireUserId);

router.get('/', asyncHandler(wishlistController.listWishlist));
router.get('/ids', asyncHandler(wishlistController.listWishlistIds));
router.post('/toggle', asyncHandler(wishlistController.toggleWishlist));
router.delete('/:movieId', asyncHandler(wishlistController.removeWishlistItem));

export default router;
