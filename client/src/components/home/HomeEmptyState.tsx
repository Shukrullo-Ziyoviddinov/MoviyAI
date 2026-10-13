"use client";

import { useRouter } from "next/navigation";
import { ChatBubbleIcon, FilmIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

export function HomeEmptyState() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const t = useT();

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
        {t("home.emptyTitle")}
      </p>
      <p className="mt-2 max-w-[280px] text-center text-[14px] leading-5" style={{ color: colors.textMuted }}>
        {t("home.emptySubtitle")}
      </p>
      <button
        type="button"
        className="mt-[22px] flex items-center gap-2 rounded-[14px] px-5 py-[13px] text-[15px] font-bold"
        style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
        onClick={() => router.push("/")}
      >
        <ChatBubbleIcon size={18} color={colors.textOnAccent} />
        {t("home.goToChat")}
      </button>
    </div>
  );
}
