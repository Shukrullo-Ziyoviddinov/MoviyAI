import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

test('real multipart middleware transports image bytes and blocks video uploads', async () => {
  let captured;
  class AiServiceError extends Error {}
  class ConversationError extends Error {}
  const service = { ConversationError, sendConversationMessage: async (owner, id, requestId, text, delta, images) => {
    captured = { owner, images }; delta?.('Found'); return { id, turns: [{ requestId, text, answer: 'Found' }] };
  } };
  const controllerSource = readFileSync(new URL('../dist/ai/controllers/conversation.controller.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/\bexport /g, '');
  const conversations = new Function('z', 'service', 'AiServiceError', controllerSource + '\nreturn {send};')(z, service, AiServiceError);
  const routeSource = readFileSync(new URL('../dist/ai/routes/ai.routes.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace('export default router;', 'return router;');
  const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const auth = (req, _res, next) => { req.userId = 'alice'; next(); };
  const router = new Function('Router', 'multer', 'rateLimit', 'requireAuth', 'asyncHandler', 'chat', 'conversations', routeSource)
    (Router, multer, () => (_req, _res, next) => next(), auth, asyncHandler, () => {}, conversations);
  const app = express(); app.use(express.json()); app.use('/api/ai', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/ai/conversations/${randomUUID()}/messages`;
    const form = new FormData(); form.append('requestId', randomUUID()); form.append('text', 'Find movie');
    form.append('images', new Blob([Buffer.from([255, 216, 255])], { type: 'image/jpeg' }), 'frame.jpg');
    const result = await fetch(url, { method: 'POST', headers: { Accept: 'text/event-stream' }, body: form });
    assert.equal(result.status, 200); assert.match(await result.text(), /"type":"done"/);
    assert.equal(captured.owner, 'alice'); assert.equal(captured.images[0].data.toString('hex'), 'ffd8ff');
    const video = new FormData(); video.append('requestId', randomUUID()); video.append('text', 'Video');
    video.append('images', new Blob(['video'], { type: 'video/mp4' }), 'video.mp4');
    assert.equal((await fetch(url, { method: 'POST', body: video })).status, 415);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
