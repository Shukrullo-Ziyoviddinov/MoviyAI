import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG } from '../config/ai.config.js';

let started = false;
const TIMEOUT_MS = 30_000;

/** Temporary opt-in startup probe; never logs credentials, prompts, or answers. */
export async function runAiDiagnostic(): Promise<void> {
  if (process.env.AI_DIAGNOSTIC !== 'true' || started) return;
  started = true;
  const model = AI_CONFIG.models.chat;
  if (!AI_CONFIG.apiKey?.trim()) {
    console.info('[AI_DIAGNOSTIC]', JSON.stringify({
      event: 'skipped', model, reason: 'missing_api_key',
    }));
    return;
  }

  const start = Date.now();
  console.info('[AI_DIAGNOSTIC]', JSON.stringify({ event: 'started', model, timeoutMs: TIMEOUT_MS }));
  try {
    const ai = new GoogleGenAI({
      apiKey: AI_CONFIG.apiKey.trim(),
      httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } },
    });
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Salom. Qisqa javob ber.' }] }],
      config: { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
    });
    console.info('[AI_DIAGNOSTIC]', JSON.stringify({
      event: response.text?.trim() ? 'success' : 'empty_response',
      model, elapsedMs: Date.now() - start,
    }));
  } catch (error) {
    const failure = error as { status?: unknown; name?: unknown } | null;
    const status = typeof failure?.status === 'number' && Number.isInteger(failure.status)
      && failure.status >= 400 && failure.status <= 599 ? failure.status : undefined;
    const timeout = failure?.name === 'AbortError' || failure?.name === 'TimeoutError';
    // Raw errors may contain headers, URLs, or request data. Log only allowlisted fields.
    console.info('[AI_DIAGNOSTIC]', JSON.stringify({
      event: 'failed', model, elapsedMs: Date.now() - start,
      reason: timeout ? 'timeout' : status ? 'provider_http_error' : 'network_or_sdk_error',
      ...(status ? { httpStatus: status } : {}),
    }));
  }
}
