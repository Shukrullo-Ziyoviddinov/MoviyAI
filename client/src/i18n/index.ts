import type { AppLanguage } from "@/components/language/language-state";
import en from "@/i18n/locales/en.json";
import ru from "@/i18n/locales/ru.json";
import uz from "@/i18n/locales/uz.json";

const dictionaries: Record<AppLanguage, unknown> = { uz, ru, en };

function lookup(source: unknown, key: string) {
  let node = source;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object" || !(part in node)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(language: AppLanguage, key: string, vars?: Record<string, string | number>) {
  const text = lookup(dictionaries[language], key) ?? lookup(dictionaries.uz, key) ?? key;
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function durationUnit(language: AppLanguage) {
  if (language === "ru") return "мин";
  if (language === "en") return "min";
  return "daq";
}
