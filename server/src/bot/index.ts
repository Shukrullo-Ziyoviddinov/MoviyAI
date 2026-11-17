import type { Express } from 'express';
import { env } from '../config/env.js';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';
import { telegram } from './api.js';
import { validWebhook, webhookSecret } from './security.js';
import { acceptUpdate, startBotWorker } from './worker.js';
import { relayMedia } from './media.js';
import { claimResult } from './results.js';

const webhookPath = '/api/telegram/webhook';
let connecting = false;
let reconnect: ReturnType<typeof setTimeout> | undefined;
export function attachTelegramBot(app: Express) {
  app.post(webhookPath, async (req, res) => {
    if (!validWebhook(req.header('X-Telegram-Bot-Api-Secret-Token') ?? '')) { res.sendStatus(403); return; }
    try { await acceptUpdate(req.body); res.sendStatus(200); }
    catch { res.sendStatus(503); }
  });
  app.get('/api/telegram/media/:id', (req, res) => { void relayMedia(req, res).catch(() => { if (!res.headersSent) res.sendStatus(502); else res.destroy(); }); });
  app.post('/api/telegram/result', requireAuth, async (req, res) => {
    try {
      if (typeof req.body?.token !== 'string' || typeof req.body?.initData !== 'string') { res.sendStatus(400); return; }
      const conversationId = await claimResult((req as AuthRequest).userId, req.body.token, req.body.initData);
      res.json({ ok: true, conversationId });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      res.status(message === 'RESULT_FORBIDDEN' ? 403 : message === 'RESULT_NOT_FOUND' ? 404 : 503).json({ ok: false, error: 'Natijani ochib bo‘lmadi. Telegram botdagi tugma orqali qayta oching.' });
    }
  });
}
export async function connectTelegramBot() {
  if (!env.telegramBotToken) { console.log('Telegram bot skipped: TELEGRAM_BOT_TOKEN is not set'); return; }
  if (connecting) return;
  connecting = true;
  if (reconnect) clearTimeout(reconnect);
  startBotWorker();
  try {
    await telegram('setWebhook', { url: `${env.publicUrl}${webhookPath}`, secret_token: webhookSecret(), allowed_updates: ['message'] });
    console.log('Telegram bot connected');
  } catch {
    console.error('Telegram webhook registration failed; retry scheduled');
    reconnect = setTimeout(() => { void connectTelegramBot(); }, 60000);
    reconnect.unref();
  } finally { connecting = false; }
}
