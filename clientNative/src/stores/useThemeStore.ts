import { darkColors, lightColors, type ThemeColors, type ThemeMode } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeState = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      colors: darkColors,
      isDark: true,

      setMode: (mode) =>
        set({
          mode,
          colors: mode === 'dark' ? darkColors : lightColors,
          isDark: mode === 'dark',
        }),

      toggle: () => {
        const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
        get().setMode(next);
      },
    }),
    {
      name: 'moviy-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setMode(state.mode);
      },
    }
  )
);

/** Yangi sahifa/blok uchun: const { colors, isDark, toggle } = useTheme(); */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);
  const setMode = useThemeStore((s) => s.setMode);

  return { mode, colors, isDark, toggle, setMode };
}
