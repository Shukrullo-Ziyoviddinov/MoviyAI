import { Router } from 'express';
import * as genreController from '../controllers/genre.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(genreController.listGenres));
router.post('/', asyncHandler(genreController.createGenre));
router.patch('/:id', asyncHandler(genreController.updateGenre));
router.delete('/:id', asyncHandler(genreController.removeGenre));

export default router;
