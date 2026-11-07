import { AI_CONFIG } from '../config/ai.config.js';
import type { AiMediaRequest, AiResult } from '../types/ai.types.js';
import { AiServiceError, generateAiResponse, historyContents } from './google-ai.service.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
]);
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

export function analyzeWithGemini(request: AiMediaRequest): Promise<AiResult> {
  if (!request.media.length) throw new AiServiceError('Rasm yoki video talab qilinadi.');
  let totalBytes = 0;
  for (const item of request.media) {
    if (!ALLOWED_MIME_TYPES.has(item.mimeType)) {
      throw new AiServiceError('Rasm yoki video formati qo‘llanmaydi.');
    }
    if (!Buffer.isBuffer(item.data) || !item.data.length) {
      throw new AiServiceError('Media fayli bo‘sh yoki noto‘g‘ri.');
    }
    totalBytes += item.data.length;
  }
  if (totalBytes > MAX_INLINE_BYTES) {
    throw new AiServiceError('Media fayllari jami 15 MB dan oshmasligi kerak.');
  }
  const model = request.media.some(item => item.mimeType.startsWith('video/'))
    ? AI_CONFIG.models.video : AI_CONFIG.models.image;
  return generateAiResponse(model, [
    ...historyContents(request.history),
    { role: 'user', parts: [
      { text: request.text.trim() || 'Rasm yoki videoni tahlil qilib, kino topishga yordam beradigan belgilarni aniqlang.' },
      ...request.media.map(item => ({ inlineData: {
        mimeType: item.mimeType, data: item.data.toString('base64'),
      } })),
    ] },
  ], 'Siz Moviy AI media tahlilchisisiz. Foydalanuvchi tilida javob bering. Kuzatilgan belgilar va kino haqidagi taxminlarni ajrating. Ishonchsiz kino nomini tasdiqlangan deb aytmang. Internet qidiruvi bu bosqichda ulanmagan.');
}
