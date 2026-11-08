import { AI_CONFIG } from '../config/ai.config.js';
import { AI_TOPIC_POLICY } from '../config/ai-policy.js';
import type { AiResult, AiTextRequest } from '../types/ai.types.js';
import { AiServiceError, generateAiResponse } from './google-ai.service.js';

export function chatWithGemma(request: AiTextRequest, onDelta?: (text: string) => void): Promise<AiResult> {
  const text = request.text.trim();
  if (!text) throw new AiServiceError('Xabar matni bo‘sh bo‘lmasligi kerak.');
  const history = request.history ?? [];
  for (const message of history) {
    if (!['user', 'model'].includes(message.role) || !message.text.trim()) {
      throw new AiServiceError('Suhbat tarixi noto‘g‘ri formatda.');
    }
  }
  // Gemini media requests continue using native multi-message history.
  const prompt = history.length ? [
    'Quyidagi suhbatni davom ettiring. Oxirgi User xabariga javob bering.',
    ...history.map(message => `${message.role === 'user' ? 'User' : 'AI'}: ${message.text.trim()}`),
    `User: ${text}`,
  ].join('\n') : text;
  return generateAiResponse(AI_CONFIG.models.chat, [
    { role: 'user', parts: [{ text: prompt }] },
  ], AI_TOPIC_POLICY, onDelta);
}
