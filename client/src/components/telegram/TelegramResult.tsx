"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/components/auth/auth-state';
import { useChat } from '@/components/chat/chat-state';

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}
function resultToken() {
  const value = new URL(window.location.href).searchParams.get('telegramResult') ?? '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}

export function TelegramResult() {
  const { ready, profile, openAuthModal } = useAuth();
  const { openChat, initialized } = useChat();
  const token = useSyncExternalStore(subscribe, resultToken, () => '');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const owner = profile?.id;
  useEffect(() => {
    if (!token || !ready || !owner || !initialized) return;
    const initData = window.Telegram?.WebApp?.initData;
    let alive = true;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!initData) throw Error('Natijani Telegram botdagi tugma orqali oching.');
      return apiFetch<{ ok: boolean; conversationId?: string; error?: string }>('/api/telegram/result', {
        method: 'POST', body: JSON.stringify({ token, initData }), signal: controller.signal,
      });
    }).then(async result => {
      if (!alive) return;
      if (!result.ok || !result.conversationId) throw Error(result.error || 'Natijani ochib bo‘lmadi.');
      if (!await openChat(result.conversationId)) throw Error('Suhbatni ochib bo‘lmadi. Qayta urinib ko‘ring.');
      if (!alive) return;
      const url = new URL(window.location.href);
      url.searchParams.delete('telegramResult');
      window.history.replaceState(window.history.state, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'Natijani ochib bo‘lmadi.'); });
    return () => { alive = false; controller.abort(); };
  }, [token, ready, owner, initialized, retry, openChat]);
  if (!token || !ready) return null;
  if (!profile) return <div className="fixed inset-x-4 top-28 z-50 rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
    <p>Telegram natijasini saqlash va ko‘rish uchun Moviy AI akkauntingizga kiring.</p>
    <button type="button" onClick={openAuthModal} className="mt-3 rounded-xl bg-blue-600 px-4 py-2">Kirish</button>
  </div>;
  if (!error) return null;
  return <div role="alert" className="fixed inset-x-4 top-28 z-50 rounded-2xl bg-slate-900 p-4 text-white shadow-xl">
    <p>{error}</p><button type="button" onClick={() => { setError(''); setRetry(value => value + 1); }} className="mt-3 rounded-xl bg-blue-600 px-4 py-2">Qayta urinish</button>
  </div>;
}
