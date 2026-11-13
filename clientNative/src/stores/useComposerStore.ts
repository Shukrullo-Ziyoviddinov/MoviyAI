import type { SelectedMedia } from '@/components/chat/SelectedMediaStrip';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useSideMenuStore } from './useSideMenuStore';

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
    useSideMenuStore.getState().suspendGestures();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ['images'] : ['videos'],
        allowsMultipleSelection: true,
        quality: type === 'image' ? 0.9 : 1,
        ...(type === 'image' ? { preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible } : {}),
        selectionLimit: type === 'image' ? 3 : 1,
      });

      if (result.canceled) return;

      const nextItems: SelectedMedia[] = result.assets.map((asset, index) => ({
        id: asset.assetId ?? `${asset.uri}-${Date.now()}-${index}`,
        uri: asset.uri,
        type,
        mimeType: asset.mimeType ?? undefined,
        file: asset.file,
        fileName: asset.fileName ?? undefined,
        fileSize: asset.fileSize ?? undefined,
        durationSeconds:asset.duration!=null?asset.duration/1000:undefined,
        width: asset.width,
        height: asset.height,
      }));

      set((state) => {
        if(type==='video')return {selectedMedia:nextItems.slice(0,1)};
        const images=state.selectedMedia.filter(item=>item.type==='image');
        const existing = new Set(images.map((item) => item.uri));
        const unique = nextItems.filter((item) => !existing.has(item.uri));
        return { selectedMedia: [...images, ...unique].slice(0,3) };
      });
    } catch {
      Alert.alert('Xato', 'Galereyani ochib bo‘lmadi.');
    } finally {
      useSideMenuStore.getState().resumeGestures();
      set({ picking: false });
    }
  },

  removeMedia: (id) =>
    set((state) => ({
      selectedMedia: state.selectedMedia.filter((item) => item.id !== id),
    })),

  clearMedia: () => set({ selectedMedia: [] }),
}));
