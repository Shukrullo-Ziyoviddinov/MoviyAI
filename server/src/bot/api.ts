import axios from 'axios';
import { env } from '../config/env.js';
import type { InlineButton } from './types.js';
import { formatTelegramText, entitiesForChunk } from './format.js';

export class TelegramError extends Error {
  constructor(public readonly status: number, public readonly retryAfter = 30) { super('Telegram request failed'); }
}
export async function telegram<T>(method: string, body: object = {}, options: { timeoutMs?: number } = {}): Promise<T> {
  if (!env.telegramBotToken) throw new TelegramError(503);
  try {
    const { data } = await axios.post<{ ok: boolean; result: T; error_code?: number; parameters?: { retry_after?: number } }>(
      `https://api.telegram.org/bot${env.telegramBotToken}/${method}`, body, { timeout: Math.max(1000, Math.min(15000, options.timeoutMs ?? 15000)) });
    if (!data.ok) throw new TelegramError(data.error_code ?? 502, retrySeconds(data.parameters?.retry_after));
    return data.result;
  } catch (error) {
    // Axios errors contain token-bearing request URLs. Never propagate or log them.
    throw error instanceof TelegramError ? error : new TelegramError(axios.isAxiosError(error) ? error.response?.status ?? 502 : 502,
      axios.isAxiosError(error) ? retrySeconds(error.response?.data?.parameters?.retry_after) : 30);
  }
}
function retrySeconds(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(3600, value)) : 30; }
export async function sendTelegramMessage(chatId: number, text: string, buttons: InlineButton[][] = [], delivery: { start?: number; onSent?: (parts: number) => Promise<void> } = {}) {
  const formatted = formatTelegramText(text);
  const chunks = splitTelegramText(formatted.text);
  let offset = 0;
  let last: { message_id: number } | undefined;
  for (const [index, chunk] of chunks.entries()) {
    const entities = entitiesForChunk(formatted.entities, offset, chunk.length);
    offset += chunk.length;
    if (index < (delivery.start ?? 0)) continue;
    last = await telegram<{ message_id: number }>('sendMessage', {
      chat_id: chatId, text: chunk,
      ...(entities.length ? { entities } : {}),
      ...(buttons.length && index === chunks.length - 1 ? { reply_markup: { inline_keyboard: buttons } } : {}),
    });
    await delivery.onSent?.(index + 1);
  }
  return last;
}
export function splitTelegramText(text: string) {
  const chunks: string[] = [];
  while (text.length > 4000) {
    let end = 4000;
    // Never separate the two UTF-16 code units of an emoji.
    if (/^[\uD800-\uDBFF]$/.test(text[end - 1])) end--;
    const newline = text.lastIndexOf('\n', end - 1);
    if (newline > 2000) end = newline + 1;
    chunks.push(text.slice(0, end)); text = text.slice(end);
  }
  if (text) chunks.push(text);
  return chunks;
}
