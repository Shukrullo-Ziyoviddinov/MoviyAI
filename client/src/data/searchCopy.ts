import type { AppLanguage } from "@/components/language/language-state";
import { translate } from "@/i18n";

export type SearchCopy = {
  placeholder: string;
  aiHelper: string;
  heroTitle: string;
  heroSubtitle: string;
  guideText: string;
  guideGotIt: string;
};

export function searchCopy(language: AppLanguage): SearchCopy {
  const t = (key: string) => translate(language, key);
  return {
    placeholder: t("search.placeholder"),
    aiHelper: t("search.aiHelper"),
    heroTitle: t("search.heroTitle"),
    heroSubtitle: t("search.heroSubtitle"),
    guideText: t("search.guideText"),
    guideGotIt: t("search.guideGotIt"),
  };
}
