import type { Request, Response } from 'express';
import { z } from 'zod';
import { chatWithGemma } from '../services/gemma.service.js';
import { analyzeWithGemini } from '../services/gemini.service.js';
import { AiServiceError } from '../services/google-ai.service.js';

const chatSchema = z.object({
  text: z.string().trim().max(20_000).default(''),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().trim().min(1).max(20_000),
  }).strict()).max(30).default([]),
}).strict();

export async function chat(req: Request, res: Response) {
  const body = { ...req.body };
  if (req.is('multipart/form-data') && typeof body.history === 'string') {
    try {
      body.history = JSON.parse(body.history);
    } catch {
      res.status(400).json({ ok: false, error: 'history must be valid JSON' });
      return;
    }
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid chat input', details: parsed.error.flatten() });
    return;
  }
  const files = Array.isArray(req.files) ? req.files : [];
  if (!parsed.data.text && !files.length) {
    res.status(400).json({ ok: false, error: 'Text or media is required' });
    return;
  }
  if (files.reduce((total, file) => total + file.size, 0) > 15 * 1024 * 1024) {
    res.status(413).json({ ok: false, error: 'Total media size exceeds 15 MB' });
    return;
  }
  try {
    const result = files.length
      ? await analyzeWithGemini({
        ...parsed.data,
        media: files.map(file => ({ mimeType: file.mimetype, data: file.buffer })),
      })
      : await chatWithGemma(parsed.data);
    res.json({ ok: true, data: { role: 'model', ...result } });
  } catch (error) {
    if (!(error instanceof AiServiceError)) throw error;
    const status = error.status === 429 ? 429 : 502;
    res.status(status).json({
      ok: false,
      error: 'AI response could not be generated. Please try again.',
    });
  }
}
