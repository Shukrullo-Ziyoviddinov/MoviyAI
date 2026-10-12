"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

type IconComp = (props: { size?: number; color?: string }) => ReactNode;

export function SettingsMenuRow({
  title,
  subtitle,
  Icon,
  value,
  onPress,
  right,
  showChevron = true,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  Icon: IconComp;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  danger?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const iconColor = danger ? (isDark ? "#F87171" : "#DC2626") : colors.accent;
  const titleColor = danger ? (isDark ? "#FCA5A5" : "#B91C1C") : colors.text;

  const className = "flex w-full items-center gap-3 px-3.5 py-[13px] text-left";
  const body = (
    <>
      <span
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border"
        style={{
          backgroundColor: isDark ? "rgba(30, 60, 140, 0.22)" : "rgba(30, 79, 214, 0.1)",
          borderColor: isDark ? "rgba(70, 120, 220, 0.28)" : "rgba(30, 79, 214, 0.22)",
        }}
      >
        <Icon size={18} color={iconColor} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold" style={{ color: titleColor }}>
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[12px]" style={{ color: colors.textMuted }}>
            {subtitle}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="text-[14px] font-semibold" style={{ color: colors.text }}>
          {value}
        </span>
      ) : null}
      {right ? right : showChevron ? <ChevronRightIcon size={18} color={danger ? iconColor : colors.textMuted} /> : null}
    </>
  );

  if (right || !onPress) return <div className={className}>{body}</div>;

  return (
    <button type="button" onClick={onPress} className={className}>
      {body}
    </button>
  );
}
