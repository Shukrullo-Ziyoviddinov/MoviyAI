import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listHomeSections, listMovieSection } from '../controllers/movie-listing.controller.js';

const router = Router();
router.get('/home', asyncHandler(listHomeSections));
router.get('/:categoryName', asyncHandler(listMovieSection));
export default router;
