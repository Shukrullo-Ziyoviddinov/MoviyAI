"use client";

import { useLanguage } from "@/components/language/language-state";
import { translate } from "@/i18n";

export function useT() {
  const { language } = useLanguage();
  return (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);
}
