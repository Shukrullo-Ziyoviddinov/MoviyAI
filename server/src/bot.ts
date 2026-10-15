import axios from 'axios';
import type { Express, Request, Response } from 'express';
import { env } from './config/env.js';

type TelegramUser = {
  id: number;
  username?: string;
};

type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat: { id: number };
  };
};

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

const webhookPath = '/api/telegram/webhook';

async function callTelegram<T>(method: string, body?: object): Promise<T> {
  const token = env.telegramBotToken;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  const { data } = await axios.post<TelegramResponse<T>>(
    `https://api.telegram.org/bot${token}/${method}`,
    body ?? {},
    { timeout: 15000 }
  );
  if (!data.ok || data.result === undefined) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

export async function sendTelegramMessage(chatId: number, text: string) {
  await callTelegram('sendMessage', { chat_id: chatId, text });
}

async function onUpdate(update: TelegramUpdate) {
  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim() ?? '';
  if (!chatId || !text) return;
  if (text === '/start' || text.startsWith('/start@') || text.startsWith('/start ')) {
    await sendTelegramMessage(
      chatId,
      "Assalomu alaykum va rahmatulloh va barakatuh. Qanday savolingiz bor yoki qanday kino ko‘rishni hohlaysiz, chatga yozib qoldiring. MoviyAI siz hohlagan savol va kinolarni topishda yordam beradi.",
    );
  }
}

export function attachTelegramBot(app: Express) {
  app.post(webhookPath, (req: Request, res: Response) => {
    res.sendStatus(200);
    const update = req.body as TelegramUpdate;
    void onUpdate(update).catch((err) => {
      console.error('Telegram update failed:', err instanceof Error ? err.message : err);
    });
  });
}

export async function connectTelegramBot() {
  if (!env.telegramBotToken) {
    console.log('Telegram bot skipped: TELEGRAM_BOT_TOKEN is not set');
    return;
  }
  try {
    const me = await callTelegram<TelegramUser>('getMe');
    const webhookUrl = `${env.publicUrl}${webhookPath}`;
    await callTelegram('setWebhook', { url: webhookUrl });
    console.log(`Telegram bot @${me.username ?? me.id} connected: ${webhookUrl}`);
  } catch (err) {
    console.error('Telegram bot failed to connect:', err instanceof Error ? err.message : err);
  }
}
