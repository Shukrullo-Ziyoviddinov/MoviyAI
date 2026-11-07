import { AI_CONFIG } from '../config/ai.config.js';
import type {
  SerperImagesResponse,
  SerperSearchOptions,
  SerperSearchResponse,
} from '../types/serper.types.js';

const SERPER_BASE_URL = 'https://google.serper.dev';
const REQUEST_TIMEOUT_MS = 15_000;

export class SerperError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'SerperError';
  }
}

async function request<T>(
  endpoint: 'search' | 'images',
  query: string,
  options: SerperSearchOptions,
): Promise<T> {
  const apiKey = AI_CONFIG.serperApiKey?.trim();
  if (!apiKey) {
    throw new SerperError('SERPER_API_KEY sozlanmagan.');
  }
  const q = query.trim();
  if (!q) {
    throw new SerperError('Qidiruv matni bo‘sh bo‘lmasligi kerak.');
  }
  if (options.num !== undefined &&
      (!Number.isInteger(options.num) || options.num < 1 || options.num > 100)) {
    throw new SerperError('Natijalar soni 1 dan 100 gacha butun son bo‘lishi kerak.');
  }
  if (options.page !== undefined &&
      (!Number.isInteger(options.page) || options.page < 1)) {
    throw new SerperError('Sahifa raqami musbat butun son bo‘lishi kerak.');
  }

  let response: Response;
  try {
    response = await fetch(`${SERPER_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, ...options }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Do not expose request headers or credentials in errors.
    throw new SerperError('Serper bilan ulanishda xato yoki kutish vaqti tugadi.');
  }

  if (!response.ok) {
    throw new SerperError(
      `Serper so‘rovi bajarilmadi (HTTP ${response.status}).`,
      response.status,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new SerperError('Serper javobi JSON formatida emas.');
  }
}

export function searchWeb(
  query: string,
  options: SerperSearchOptions = {},
): Promise<SerperSearchResponse> {
  return request('search', query, options);
}

export function searchImages(
  query: string,
  options: SerperSearchOptions = {},
): Promise<SerperImagesResponse> {
  return request('images', query, options);
}
