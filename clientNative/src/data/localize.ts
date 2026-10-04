import type { AppLanguage } from '@/src/stores/useLanguageStore';

export type LocalizedText = {
  uz: string;
  ru: string;
  en: string;
};

export function pickLocalized(
  text: LocalizedText | string,
  language: AppLanguage
): string {
  if (typeof text === 'string') return text;
  return text[language] ?? text.uz;
}
