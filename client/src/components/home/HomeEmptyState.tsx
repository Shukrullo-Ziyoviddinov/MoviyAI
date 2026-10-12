"use client";

import { useRouter } from "next/navigation";
import { ChatBubbleIcon, FilmIcon } from "@/components/icons";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";

const COPY = {
  uz: {
    title: "Hali hech narsa yo'q",
    subtitle: "Kinolar va tavsiyalar shu yerda paydo bo'ladi. Hozir AI Chat orqali qidirishni boshlang.",
    action: "AI Chatga o'tish",
  },
  ru: {
    title: "Пока здесь пусто",
    subtitle: "Фильмы и рекомендации появятся здесь. Начните поиск через AI Chat.",
    action: "Перейти в AI Chat",
  },
  en: {
    title: "Nothing here yet",
    subtitle: "Movies and recommendations will show up here. Start searching with AI Chat.",
    action: "Go to AI Chat",
  },
};

export function HomeEmptyState() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const copy = COPY[language];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div
        className="mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] border"
        style={{
          backgroundColor: isDark ? "rgba(30, 79, 214, 0.18)" : "rgba(30, 79, 214, 0.1)",
          borderColor: colors.borderSoft,
        }}
      >
        <FilmIcon size={42} color={colors.accentBright} />
      </div>
      <p className="text-center text-[20px] font-bold" style={{ color: colors.text }}>
        {copy.title}
      </p>
      <p className="mt-2 max-w-[280px] text-center text-[14px] leading-5" style={{ color: colors.textMuted }}>
        {copy.subtitle}
      </p>
      <button
        type="button"
        className="mt-[22px] flex items-center gap-2 rounded-[14px] px-5 py-[13px] text-[15px] font-bold"
        style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
        onClick={() => router.push("/")}
      >
        <ChatBubbleIcon size={18} color={colors.textOnAccent} />
        {copy.action}
      </button>
    </div>
  );
}
