"use client";

import { useLanguage } from '@/components/language/language-state';

const copy = {
  uz: ['Telegram orqali kirib bo‘lmadi. Qayta urining yoki ilovani bot orqali qayta oching.', 'Qayta urinish'],
  ru: ['Не удалось войти через Telegram. Повторите попытку или заново откройте приложение через бота.', 'Повторить'],
  en: ['Could not sign in with Telegram. Retry or reopen the app from the bot.', 'Retry'],
};
export function TelegramAuthNotice({ onRetry }: { onRetry: () => void }) {
  const { language } = useLanguage();
  return <div role="alert" className="fixed inset-x-4 top-28 z-[130] rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
    <p>{copy[language][0]}</p>
    <button type="button" onClick={onRetry} className="mt-3 rounded-xl bg-blue-600 px-4 py-2">{copy[language][1]}</button>
  </div>;
}
