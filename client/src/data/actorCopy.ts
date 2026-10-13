import type { AppLanguage } from "@/components/language/language-state";
import { translate } from "@/i18n";

export type ActorCopy = {
  aboutTitle: string;
  moviesTitle: string;
  readMore: string;
  notFound: string;
};

export function actorCopy(language: AppLanguage): ActorCopy {
  const t = (key: string) => translate(language, key);
  return {
    aboutTitle: t("actor.aboutTitle"),
    moviesTitle: t("actor.moviesTitle"),
    readMore: t("actor.readMore"),
    notFound: t("actor.notFound"),
  };
}
