import type { ChatMediaItem, ChatMessage } from '@/src/types/chat';
import { create } from 'zustand';

function chunkMedia(items: ChatMediaItem[], size = 4): ChatMediaItem[][] {
  const chunks: ChatMediaItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type ChatState = {
  messages: ChatMessage[];
  sendMessage: (payload: { text?: string; media?: ChatMediaItem[] }) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  sendMessage: ({ text, media = [] }) => {
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

    set((state) => ({
      messages: [...state.messages, ...next],
    }));
  },

  clearMessages: () => set({ messages: [] }),
}));
