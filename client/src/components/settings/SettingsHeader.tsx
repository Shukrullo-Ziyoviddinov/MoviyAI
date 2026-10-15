"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

export function SettingsHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <div className="px-[18px]">
      <div className="mb-4 flex items-center" style={{ height: "var(--tg-home-row, auto)" }}>
        <button
          type="button"
          aria-label="Orqaga"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </button>
      </div>
      <h1 className="text-[28px] font-bold" style={{ color: colors.text }}>
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[13px] leading-[18px]" style={{ color: colors.textMuted }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
