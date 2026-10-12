import type { ChatMediaItem } from '@/src/types/chat';
import { create } from 'zustand';

type MediaViewerState = {
  item: ChatMediaItem | null;
  open: (item: ChatMediaItem) => void;
  close: () => void;
};

export const useMediaViewerStore = create<MediaViewerState>((set) => ({
  item: null,
  open: (item) => {
    set({ item });
  },
  close: () => set({ item: null }),
}));
