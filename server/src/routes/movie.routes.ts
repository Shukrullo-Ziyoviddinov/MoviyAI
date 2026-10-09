import { Router } from 'express';
import * as movieController from '../controllers/movie.controller.js';
import { optionalAuth, requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(movieController.listMovies));
router.post('/', movieController.uploadPoster, asyncHandler(movieController.createMovie));
router.get(
  '/:id/similar-trailers',
  asyncHandler(movieController.listSimilarTrailers)
);
router.get(
  '/:id/similar-movies',
  asyncHandler(movieController.listSimilarMovies)
);
router.get('/:id/comments', asyncHandler(movieController.listComments));
router.get(
  '/:id/comments/:commentId/replies',
  asyncHandler(movieController.listCommentReplies)
);
router.post(
  '/:id/comments',
  requireAuth,
  asyncHandler(movieController.createComment)
);
router.get('/:id', optionalAuth, asyncHandler(movieController.getMovie));
router.post(
  '/:id/reaction',
  requireAuth,
  asyncHandler(movieController.toggleReaction)
);

export default router;
