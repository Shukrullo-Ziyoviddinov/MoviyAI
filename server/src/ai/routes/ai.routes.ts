import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth, type AuthRequest } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { chat } from '../controllers/ai.controller.js';

const router = Router();
const allowedTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 3,
    fields: 2,
    fieldSize: 1024 * 1024,
    parts: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_AI_MEDIA'));
  },
}).array('media', 3);

const parseMedia: RequestHandler = (req, res, next) => {
  if (!req.is('application/json') && !req.is('multipart/form-data')) {
    res.status(415).json({ ok: false, error: 'Use application/json or multipart/form-data' });
    return;
  }
  upload(req, res, error => {
    if (!error) { next(); return; }
    if (error instanceof multer.MulterError) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
        .json({ ok: false, error: 'Media upload limit exceeded or invalid upload field' });
      return;
    }
    if (error instanceof Error && error.message === 'UNSUPPORTED_AI_MEDIA') {
      res.status(415).json({ ok: false, error: 'Unsupported image or video type' });
      return;
    }
    next(error);
  });
};

router.post('/chat', requireAuth, rateLimit({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: req => (req as AuthRequest).userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many AI requests. Please try again later.' },
}), parseMedia, asyncHandler(chat));

export default router;
