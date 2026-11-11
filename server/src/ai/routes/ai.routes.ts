import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth, type AuthRequest } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { chat } from '../controllers/ai.controller.js';
import * as conversations from '../controllers/conversation.controller.js';

const router = Router();
const allowedTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp',
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

const aiLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: req => (req as AuthRequest).userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many AI requests. Please try again later.' },
});
const imageUpload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: 4 * 1024 * 1024, files: 3, fields: 2, parts: 5, fieldSize: 128 * 1024,
}, fileFilter: (_req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
  else cb(new Error('UNSUPPORTED_CHAT_IMAGE'));
} }).array('images', 3);
const parseChatImages: RequestHandler = (req, res, next) => {
  if (req.is('application/json')) { next(); return; }
  if (!req.is('multipart/form-data')) { res.status(415).json({ ok: false, error: 'Use JSON or image multipart data' }); return; }
  imageUpload(req, res, error => {
    if (!error) { next(); return; }
    res.status(error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 415)
      .json({ ok: false, error: 'Send up to 3 JPEG, PNG or WebP images, each at most 4 MB' });
  });
};
router.post('/chat', requireAuth, aiLimit, parseMedia, asyncHandler(chat));
router.get('/conversations', requireAuth, asyncHandler(conversations.list));
router.post('/conversations', requireAuth, asyncHandler(conversations.create));
router.get('/conversations/:id', requireAuth, asyncHandler(conversations.get));
router.delete('/conversations/:id', requireAuth, asyncHandler(conversations.remove));
router.patch('/conversations/:id/pin', requireAuth, asyncHandler(conversations.pin));
router.post('/conversations/:id/messages', requireAuth, aiLimit, parseChatImages, asyncHandler(conversations.send));
router.post('/conversations/:id/uploads', requireAuth, aiLimit, asyncHandler(conversations.prepareImages));
router.post('/conversations/:id/video-upload', requireAuth, aiLimit, asyncHandler(conversations.prepareVideo));
router.get('/conversations/:id/messages/:requestId/images/:index', asyncHandler(conversations.image));

export default router;
