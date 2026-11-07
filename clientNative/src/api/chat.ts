import { api } from './client';
import axios from 'axios';

export type ChatHistory = { role: 'user' | 'model'; text: string }[];

export async function sendChatText(text: string, history: ChatHistory): Promise<string> {
  try {
    const { data } = await api.post('/api/ai/chat', { text, history }, { timeout: 75_000 });
    if (!data.ok || typeof data.data?.text !== 'string' || !data.data.text.trim()) {
      throw new Error('AI javobi noto‘g‘ri formatda.');
    }
    return data.data.text;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const status = error.response?.status;
    throw new Error(status === 401 ? 'AI bilan yozishish uchun hisobingizga kiring.' : status === 429
      ? 'So‘rovlar chegarasiga yetildi. Biroz kuting.' : 'AI javob bera olmadi. Qayta urinib ko‘ring.');
  }
}
