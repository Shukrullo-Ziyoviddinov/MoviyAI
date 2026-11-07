import { AI_CONFIG } from '../config/ai.config.js';
import type { AiResult, AiTextRequest } from '../types/ai.types.js';
import { AiServiceError, generateAiResponse, historyContents } from './google-ai.service.js';

export function chatWithGemma(request: AiTextRequest): Promise<AiResult> {
  const text = request.text.trim();
  if (!text) throw new AiServiceError('Xabar matni bo‘sh bo‘lmasligi kerak.');
  return generateAiResponse(AI_CONFIG.models.chat, [
    ...historyContents(request.history),
    { role: 'user', parts: [{ text }] },
  ], 'Siz Moviy AI yordamchisisiz. Foydalanuvchi tilida javob bering. Internet qidiruvi bajarilmagan bo‘lsa, qidiruv bajardim demang. Noma’lum faktlarni to‘qimang.');
}
