import type { AppLanguage } from "@/components/language/language-state";
import { translate } from "@/i18n";

export type AuthCopy = {
  title: string;
  subtitle: string;
  continueGoogle: string;
  hint: string;
  later: string;
  loginRequired: string;
  missingClientId: string;
  noToken: string;
  loginFailed: string;
  cancelled: string;
};

export function authCopy(language: AppLanguage): AuthCopy {
  const t = (key: string) => translate(language, key);
  return {
    title: t("auth.title"),
    subtitle: t("auth.subtitle"),
    continueGoogle: t("auth.continueGoogle"),
    hint: t("auth.hint"),
    later: t("auth.later"),
    loginRequired: t("auth.loginRequired"),
    missingClientId: t("auth.errors.missingClientId"),
    noToken: t("auth.errors.noToken"),
    loginFailed: t("auth.errors.loginFailed"),
    cancelled: t("auth.errors.cancelled"),
  };
}
