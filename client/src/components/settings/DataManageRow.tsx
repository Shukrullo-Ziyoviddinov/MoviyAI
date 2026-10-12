"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

type IconComp = (props: { size?: number; color?: string }) => ReactNode;

export function DataManageRow({
  title,
  subtitle,
  Icon,
  iconColor = "#60A5FA",
  iconBg = "rgba(37, 99, 235, 0.18)",
  onPress,
}: {
  title: string;
  subtitle: string;
  Icon: IconComp;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left"
      style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: iconBg }}>
        <Icon size={20} color={iconColor} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold" style={{ color: colors.text }}>
          {title}
        </span>
        <span className="mt-[3px] block text-[13px] leading-[18px]" style={{ color: colors.textMuted }}>
          {subtitle}
        </span>
      </span>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </button>
  );
}
