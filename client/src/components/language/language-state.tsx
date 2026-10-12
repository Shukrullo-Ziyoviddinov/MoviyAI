"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppLanguage = "uz" | "ru" | "en";

export const LANGUAGE_OPTIONS: { code: AppLanguage; label: string; flag: string }[] = [
  { code: "uz", label: "O‘zbekcha", flag: "/images/uzb-by.jpg" },
  { code: "ru", label: "Русский", flag: "/images/rubay.png" },
  { code: "en", label: "English", flag: "/images/engby.png" },
];

const KEY = "moviy-language";

type LanguageContextValue = {
  language: AppLanguage;
  label: string;
  modalOpen: boolean;
  setLanguage: (language: AppLanguage) => void;
  openModal: () => void;
  closeModal: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("uz");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "uz" || saved === "ru" || saved === "en") setLanguageState(saved);
  }, []);

  function setLanguage(next: AppLanguage) {
    setLanguageState(next);
    window.localStorage.setItem(KEY, next);
    setModalOpen(false);
  }

  const label = LANGUAGE_OPTIONS.find((item) => item.code === language)?.label ?? "O‘zbekcha";

  return (
    <LanguageContext.Provider
      value={{
        language,
        label,
        modalOpen,
        setLanguage,
        openModal: () => setModalOpen(true),
        closeModal: () => setModalOpen(false),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
