import { apiBaseUrl, readAuthToken } from './client';

export type ChatHistory = { role: 'user' | 'model'; text: string }[];

export async function sendChatText(text: string, history: ChatHistory): Promise<string> {
  const token = readAuthToken();
  if (!token) throw new Error('AI bilan yozishish uchun hisobingizga kiring.');
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, history }),
      signal: AbortSignal.timeout(75_000),
    });
  } catch {
    throw new Error('Serverga ulanib bo‘lmadi yoki kutish vaqti tugadi.');
  }
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Hisobingizga qayta kiring.' : response.status === 429
      ? 'So‘rovlar chegarasiga yetildi. Biroz kuting.' : 'AI javob bera olmadi. Qayta urinib ko‘ring.');
  }
  const result = await response.json();
  if (!result.ok || typeof result.data?.text !== 'string' || !result.data.text.trim()) {
    throw new Error('AI javobi noto‘g‘ri formatda.');
  }
  return result.data.text;
}
