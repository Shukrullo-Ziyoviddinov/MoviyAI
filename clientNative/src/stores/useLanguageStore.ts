import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppLanguage = 'uz' | 'ru' | 'en';

export const LANGUAGE_OPTIONS: {
  code: AppLanguage;
  label: string;
  flag: number;
}[] = [
  {
    code: 'uz',
    label: "O'zbekcha",
    flag: require('../../assets/images/uzb-by.jpg'),
  },
  {
    code: 'ru',
    label: 'Русский',
    flag: require('../../assets/images/rubay.png'),
  },
  {
    code: 'en',
    label: 'English',
    flag: require('../../assets/images/engby.png'),
  },
];

type LanguageState = {
  language: AppLanguage;
  modalOpen: boolean;
  setLanguage: (language: AppLanguage) => void;
  openModal: () => void;
  closeModal: () => void;
  label: () => string;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'uz',
      modalOpen: false,

      setLanguage: (language) => set({ language }),
      openModal: () => set({ modalOpen: true }),
      closeModal: () => set({ modalOpen: false }),

      label: () => {
        const found = LANGUAGE_OPTIONS.find((o) => o.code === get().language);
        return found?.label ?? "O'zbekcha";
      },
    }),
    {
      name: 'moviy-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
    }
  )
);
