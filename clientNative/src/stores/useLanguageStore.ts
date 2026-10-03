import i18n from '@/src/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppLanguage = 'uz' | 'ru' | 'en';

export const LANGUAGE_OPTIONS: {
  code: AppLanguage;
  labelKey: 'language.uz' | 'language.ru' | 'language.en';
  flag: number;
}[] = [
  {
    code: 'uz',
    labelKey: 'language.uz',
    flag: require('../../assets/images/uzb-by.jpg'),
  },
  {
    code: 'ru',
    labelKey: 'language.ru',
    flag: require('../../assets/images/rubay.png'),
  },
  {
    code: 'en',
    labelKey: 'language.en',
    flag: require('../../assets/images/engby.png'),
  },
];

type LanguageState = {
  language: AppLanguage;
  modalOpen: boolean;
  setLanguage: (language: AppLanguage) => void;
  openModal: () => void;
  closeModal: () => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'uz',
      modalOpen: false,

      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
      openModal: () => set({ modalOpen: true }),
      closeModal: () => set({ modalOpen: false }),
    }),
    {
      name: 'moviy-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          void i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
