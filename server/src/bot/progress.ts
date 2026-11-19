import { telegram, TelegramError } from './api.js';
import type { ChatStage } from '../ai/types/chat-progress.types.js';

const labels: Record<ChatStage, string> = {
  waiting_import: 'Yuklash navbati kutilmoqda…',
  checking_link: 'Havola tekshirilmoqda…',
  downloading_video: 'Video yuklab olinmoqda…',
  preparing_analysis: 'Tahlilga tayyorlanmoqda…',
  checking_video: '🎞 Video tekshirilmoqda…',
  upload_video: '🎞 Video yuklanmoqda…',
  upload_image: '🖼 Rasm tahlilga tayyorlanmoqda…',
  analyzing_video: '🎞 Videodagi sahnalar tahlil qilinmoqda…',
  analyzing_image: '🖼 Rasm tahlil qilinmoqda…',
  verifying: '🔎 Kino nomi va mosligi tekshirilmoqda…',
  catalog: '🎬 Moviy AI bazasi tekshirilmoqda…',
  searching: '🌐 Internetdagi manbalar qidirilmoqda…',
  uzbek_links: '🇺🇿 O‘zbekcha dublaj havolalari qidirilmoqda…',
  posters: '🖼 Posterlar tekshirilmoqda…',
  preparing: '✍️ Javob tayyorlanmoqda…',
};

/** One status message; real AI stage callbacks update it without blocking AI. */
export function createBotProgress(chatId: number, options: { messageId?: number | null; typing?: boolean; save: (id: number) => Promise<void> }, deps = { telegram, intervalMs: 1500, now: Date.now }) {
  let messageId = options.messageId ?? undefined;
  let closed = false, lastText = '', pending = '', nextAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  let typingTimer: ReturnType<typeof setInterval> | undefined;
  let typingBusy = false, nextTypingAt = 0;
  function typing() {
    if (closed || typingBusy || deps.now() < nextTypingAt) return;
    typingBusy = true;
    void deps.telegram('sendChatAction', { chat_id: chatId, action: 'typing' })
      .catch(error => { if (error instanceof TelegramError && error.status === 429) nextTypingAt = deps.now() + error.retryAfter * 1000; })
      .finally(() => { typingBusy = false; });
  }
  function stopTyping() { clearInterval(typingTimer); typingTimer = undefined; }
  async function edit(text: string) {
    if (!messageId || text === lastText) return;
    try {
      await deps.telegram('editMessageText', { chat_id: chatId, message_id: messageId, text });
      lastText = text;
    } catch (error) {
      if (error instanceof TelegramError && error.status === 429) nextAt = deps.now() + error.retryAfter * 1000;
    }
  }
  function pump() {
    if (closed || inFlight || !messageId || !pending) return;
    const delay = Math.max(0, nextAt - deps.now());
    if (delay) {
      if (!timer) { timer = setTimeout(() => { timer = undefined; pump(); }, delay); timer.unref(); }
      return;
    }
    const text = pending; pending = '';
    nextAt = deps.now() + deps.intervalMs;
    inFlight = edit(text).finally(() => { inFlight = undefined; pump(); });
  }
  return {
    async start(stage: ChatStage) {
      if (closed) return;
      const text = labels[stage];
      try {
        if (messageId) await edit(text);
        else {
          const sent = await deps.telegram<{ message_id: number }>('sendMessage', { chat_id: chatId, text });
          messageId = sent.message_id; lastText = text;
          await options.save(messageId);
        }
        nextAt = deps.now() + deps.intervalMs;
      } catch { /* An optional status message never fails a movie search. */ }
      if (options.typing && !typingTimer && !closed) {
        typing(); typingTimer = setInterval(typing, 4500); typingTimer.unref();
      }
    },
    report(stage: ChatStage) { if (!closed) { pending = labels[stage]; pump(); } },
    async finish(text: string) {
      stopTyping();
      closed = true; pending = ''; clearTimeout(timer); timer = undefined;
      await inFlight;
      await edit(text);
    },
    async remove() {
      stopTyping();
      closed = true; pending = ''; clearTimeout(timer); timer = undefined;
      await inFlight;
      if (messageId) try { await deps.telegram('deleteMessage', { chat_id: chatId, message_id: messageId }); } catch { /* Keep the terminal status if deletion is unavailable. */ }
    },
    dispose() { closed = true; pending = ''; clearTimeout(timer); timer = undefined; stopTyping(); },
  };
}
