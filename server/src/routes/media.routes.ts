import { Router, type NextFunction, type Request, type Response } from 'express';
import * as mediaController from '../controllers/media.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function uploadSingle(req: Request, res: Response, next: NextFunction) {
  mediaController.uploadImageMiddleware(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const code = err instanceof Error ? err.message : '';
    const multerCode = (err as { code?: string }).code;
    if (code === 'UNSUPPORTED_TYPE') {
      res.status(400).json({ ok: false, error: 'Only jpeg, png, webp' });
      return;
    }
    if (multerCode === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ ok: false, error: 'File is too large' });
      return;
    }
    next(err);
  });
}

router.get('/:folder/:fileName', asyncHandler(mediaController.getImage));
router.post(
  '/upload',
  requireAuth,
  uploadSingle,
  asyncHandler(mediaController.uploadImage)
);

export default router;
