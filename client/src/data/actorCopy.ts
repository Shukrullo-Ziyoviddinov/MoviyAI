import type { AppLanguage } from "@/components/language/language-state";

const COPY = {
  uz: {
    aboutTitle: "Aktor haqida",
    moviesTitle: "Filmlar",
    readMore: "Ko'proq",
    notFound: "Aktor topilmadi",
  },
  ru: {
    aboutTitle: "Об актёре",
    moviesTitle: "Фильмы",
    readMore: "Ещё",
    notFound: "Актёр не найден",
  },
  en: {
    aboutTitle: "About the actor",
    moviesTitle: "Movies",
    readMore: "More",
    notFound: "Actor not found",
  },
};

export type ActorCopy = { [K in keyof typeof COPY.uz]: string };

export function actorCopy(language: AppLanguage): ActorCopy {
  return COPY[language];
}
