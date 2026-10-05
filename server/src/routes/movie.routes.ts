import { Router } from 'express';
import * as movieController from '../controllers/movie.controller.js';
import { requireUserId } from '../middleware/requireUserId.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(movieController.listMovies));
router.get(
  '/:id/similar-trailers',
  asyncHandler(movieController.listSimilarTrailers)
);
router.get('/:id/comments', asyncHandler(movieController.listComments));
router.post(
  '/:id/comments',
  requireUserId,
  asyncHandler(movieController.createComment)
);
router.get('/:id', asyncHandler(movieController.getMovie));
router.post(
  '/:id/reaction',
  requireUserId,
  asyncHandler(movieController.toggleReaction)
);

export default router;
