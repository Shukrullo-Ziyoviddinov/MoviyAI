import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AppState = {
  isOnboarded: boolean;
  setOnboarded: (value: boolean) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      setOnboarded: (value) => set({ isOnboarded: value }),
      reset: () => set({ isOnboarded: false }),
    }),
    {
      name: 'moviy-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
