"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

type IconComp = (props: { size?: number; color?: string }) => ReactNode;

export function ProfileMenuRow({
  title,
  subtitle,
  Icon,
  iconColor = "#7DD3FC",
  iconBg = "rgba(56, 120, 220, 0.18)",
  onPress,
  right,
  showChevron = true,
  danger = false,
}: {
  title: string;
  subtitle: string;
  Icon: IconComp;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  danger?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const dangerColor = isDark ? "#FCA5A5" : "#B91C1C";

  const className = "flex w-full items-center gap-3 px-3.5 py-3.5 text-left";
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
        <Icon size={18} color={danger ? "#F87171" : iconColor} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold" style={{ color: danger ? dangerColor : colors.text }}>
          {title}
        </span>
        <span className="mt-0.5 block text-[12px]" style={{ color: colors.textMuted }}>
          {subtitle}
        </span>
      </span>
      {right ? right : showChevron ? <ChevronRightIcon size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (right || !onPress) return <div className={className}>{body}</div>;

  return (
    <button type="button" onClick={onPress} className={className}>
      {body}
    </button>
  );
}
