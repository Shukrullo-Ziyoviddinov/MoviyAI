import type { AppLanguage } from "@/components/language/language-state";

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

const copy: Record<AppLanguage, AuthCopy> = {
  uz: {
    title: "Google orqali kirish",
    subtitle: "Qurilmadan foydalanish uchun Google hisobingizga kirishni unutmang.",
    continueGoogle: "Google bilan davom etish",
    hint: "Kirishdan keyin ismingiz va avatar profilga saqlanadi.",
    later: "Keyinroq",
    loginRequired: "Davom etish uchun Google orqali kiring",
    missingClientId: "Google Client ID sozlanmagan",
    noToken: "Google token olinmadi",
    loginFailed: "Kirish muvaffaqiyatsiz",
    cancelled: "Kirish bekor qilindi",
  },
  ru: {
    title: "Вход через Google",
    subtitle: "Не забудьте войти в аккаунт Google, чтобы пользоваться приложением.",
    continueGoogle: "Продолжить с Google",
    hint: "После входа имя и аватар сохранятся в профиле.",
    later: "Позже",
    loginRequired: "Войдите через Google, чтобы продолжить",
    missingClientId: "Google Client ID не настроен",
    noToken: "Токен Google не получен",
    loginFailed: "Не удалось войти",
    cancelled: "Вход отменён",
  },
  en: {
    title: "Sign in with Google",
    subtitle: "Don't forget to sign in to your Google account to use the app.",
    continueGoogle: "Continue with Google",
    hint: "Your name and avatar will be saved to your profile after sign-in.",
    later: "Later",
    loginRequired: "Sign in with Google to continue",
    missingClientId: "Google Client ID is not configured",
    noToken: "Google token was not received",
    loginFailed: "Sign-in failed",
    cancelled: "Sign-in was cancelled",
  },
};

export function authCopy(language: AppLanguage) {
  return copy[language];
}
