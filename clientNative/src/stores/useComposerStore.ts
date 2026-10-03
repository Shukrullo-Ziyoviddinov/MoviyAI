import type { SelectedMedia } from '@/components/chat/SelectedMediaStrip';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { create } from 'zustand';

type ComposerState = {
  selectedMedia: SelectedMedia[];
  picking: boolean;
  pickFromDevice: (type: 'image' | 'video') => Promise<void>;
  removeMedia: (id: string) => void;
  clearMedia: () => void;
};

export const useComposerStore = create<ComposerState>((set, get) => ({
  selectedMedia: [],
  picking: false,

  pickFromDevice: async (type) => {
    if (get().picking) return;
    set({ picking: true });

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ['images'] : ['videos'],
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: 20,
      });

      if (result.canceled) return;

      const nextItems: SelectedMedia[] = result.assets.map((asset, index) => ({
        id: asset.assetId ?? `${asset.uri}-${Date.now()}-${index}`,
        uri: asset.uri,
        type,
      }));

      set((state) => {
        const existing = new Set(state.selectedMedia.map((item) => item.uri));
        const unique = nextItems.filter((item) => !existing.has(item.uri));
        return { selectedMedia: [...state.selectedMedia, ...unique] };
      });
    } catch {
      Alert.alert('Xato', 'Galereyani ochib bo‘lmadi.');
    } finally {
      set({ picking: false });
    }
  },

  removeMedia: (id) =>
    set((state) => ({
      selectedMedia: state.selectedMedia.filter((item) => item.id !== id),
    })),

  clearMedia: () => set({ selectedMedia: [] }),
}));
