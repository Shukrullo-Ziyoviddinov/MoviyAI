import type { ChatMediaItem, ChatMessage } from '@/src/types/chat';
import { create } from 'zustand';
import { sendChatText, type ChatHistory } from '@/src/api/chat';

function chunkMedia(items: ChatMediaItem[], size = 4): ChatMediaItem[][] {
  const chunks: ChatMediaItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type ChatState = {
  sending: boolean;
  error: string | null;
  pending: { text: string; history: ChatHistory } | null;
  retry: () => void;
  messages: ChatMessage[];
  sendMessage: (payload: { text?: string; media?: ChatMediaItem[] }) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  sending: false,
  error: null,
  pending: null,
  retry: () => {
    const pending = get().pending;
    if (!pending || get().sending) return;
    set({ sending: true, error: null });
    void sendChatText(pending.text, pending.history).then(text => {
      set(state => ({ pending: null, messages: [...state.messages, { id: `ai-${Date.now()}`, kind: 'text', role: 'model', text, createdAt: Date.now() }] }));
    }).catch(error => {
      set({ error: error instanceof Error ? error.message : 'Javob olinmadi.' });
    }).finally(() => set({ sending: false }));
  },
  messages: [],

  sendMessage: ({ text, media = [] }) => {
    if (get().sending || get().pending) return;
    if (media.length) {
      set({ error: 'Rasm/video tahlili keyingi bosqichda ulanadi. Hozir faqat matn yuboring.' });
      return;
    }
    const trimmed = text?.trim() ?? '';
    if (!trimmed && media.length === 0) {
      return;
    }

    const now = Date.now();
    const next: ChatMessage[] = [];

    if (media.length > 0) {
      chunkMedia(media, 4).forEach((items, index) => {
        next.push({
          id: `media-${now}-${index}`,
          kind: 'media',
          items,
          createdAt: now + index,
        });
      });
    }

    if (trimmed) {
      next.push({
        id: `text-${now}`,
        kind: 'text',
        text: trimmed,
        createdAt: now + media.length + 1,
      });
    }

    const history: ChatHistory = get().messages.filter(item => item.kind === 'text').slice(-30)
      .map(item => ({ role: item.kind === 'text' ? item.role ?? 'user' : 'user', text: item.kind === 'text' ? item.text : '' }));
    set((state) => ({
      pending: { text: trimmed, history },
      messages: [...state.messages, ...next],
    }));
    get().retry();
  },

  clearMessages: () => { if (!get().sending) set({ messages: [], pending: null, error: null }); },
}));
