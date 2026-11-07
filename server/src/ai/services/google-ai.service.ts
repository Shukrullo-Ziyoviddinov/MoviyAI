import { GoogleGenAI, type Content } from '@google/genai';
import { AI_CONFIG } from '../config/ai.config.js';
import type { AiHistoryMessage, AiResult } from '../types/ai.types.js';

export class AiServiceError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export function historyContents(history: AiHistoryMessage[] = []): Content[] {
  return history.map((message) => {
    if (!['user', 'model'].includes(message.role) || !message.text.trim()) {
      throw new AiServiceError('Suhbat tarixi noto‘g‘ri formatda.');
    }
    return { role: message.role, parts: [{ text: message.text }] };
  });
}

export async function generateAiResponse(
  model: string,
  contents: Content[],
  systemInstruction: string,
  onDelta?: (text: string) => void,
): Promise<AiResult> {
  const apiKey = AI_CONFIG.apiKey?.trim();
  if (!apiKey) throw new AiServiceError('GOOGLE_AI_API_KEY sozlanmagan.');

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 60_000, retryOptions: { attempts: 1 } },
    });
    const params = {
      model,
      contents,
      config: { systemInstruction, maxOutputTokens: 4096, abortSignal: AbortSignal.timeout(60_000) },
    };
    if (onDelta) {
      const stream = await ai.models.generateContentStream(params);
      let text = '';
      let usage: AiResult['usage'];
      for await (const chunk of stream) {
        const delta = chunk.text;
        if (delta) { text += delta; onDelta(delta); }
        if (chunk.usageMetadata) usage = {
          inputTokens: chunk.usageMetadata.promptTokenCount,
          outputTokens: chunk.usageMetadata.candidatesTokenCount,
          totalTokens: chunk.usageMetadata.totalTokenCount,
        };
      }
      if (!text.trim()) throw new AiServiceError('AI matnli javob qaytarmadi.');
      return { text: text.trim(), model, usage };
    }
    const response = await ai.models.generateContent(params);
    const text = response.text?.trim();
    if (!text) throw new AiServiceError('AI matnli javob qaytarmadi.');
    return {
      text,
      model,
      usage: response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount,
        outputTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined,
    };
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    const status = (error as { status?: unknown })?.status;
    // Provider errors can contain request details; never expose them to clients.
    throw new AiServiceError(
      'Google AI so‘rovi bajarilmadi.',
      typeof status === 'number' ? status : undefined,
    );
  }
}
