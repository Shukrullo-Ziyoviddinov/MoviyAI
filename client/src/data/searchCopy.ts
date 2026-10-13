import type { AppLanguage } from "@/components/language/language-state";

export type SearchCopy = {
  placeholder: string;
  aiHelper: string;
  heroTitle: string;
  heroSubtitle: string;
  guideText: string;
  guideGotIt: string;
};

const copy: Record<AppLanguage, SearchCopy> = {
  uz: {
    placeholder: "Kino, aktyor qidirish...",
    aiHelper: "AI qidiruv yordamchi",
    heroTitle: "Sevimli kinolaringizni yanada oson qidiring",
    heroSubtitle: "Surat yoki video orqali oson toping",
    guideText:
      "Kino nomi yoki his-tuyg‘ularingizni ta’riflab, sizga yoqadigan janr va qiziqarli yo‘nalishni yozing. Yoki topa olmayotgan kinolarni rasm va video orqali tez va oson toping.",
    guideGotIt: "Tushundim",
  },
  ru: {
    placeholder: "Поиск фильмов, актёров...",
    aiHelper: "AI помощник поиска",
    heroTitle: "Ищите любимые фильмы ещё проще",
    heroSubtitle: "Находите легко по фото или видео",
    guideText:
      "Введите название фильма или опишите настроение, любимые жанры и интересы. Или найдите фильмы по фото и видео — быстро и просто.",
    guideGotIt: "Понятно",
  },
  en: {
    placeholder: "Search movies, actors...",
    aiHelper: "AI search assistant",
    heroTitle: "Find your favorite movies even easier",
    heroSubtitle: "Discover them easily via photo or video",
    guideText:
      "Type a movie title or describe your mood, favorite genres, and interests. Or find movies you can’t locate via photo and video — fast and easy.",
    guideGotIt: "Got it",
  },
};

export function searchCopy(language: AppLanguage) {
  return copy[language];
}
