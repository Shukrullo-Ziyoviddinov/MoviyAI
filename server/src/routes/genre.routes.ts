import { Router } from 'express';
import * as genreController from '../controllers/genre.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(genreController.listGenres));

export default router;
