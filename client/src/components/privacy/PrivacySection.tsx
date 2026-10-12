"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/components/theme/theme-state";

type IconComp = (props: { size?: number; color?: string }) => ReactNode;

export function PrivacySection({
  title,
  Icon,
  iconColor = "#60A5FA",
  iconBg = "rgba(37, 99, 235, 0.18)",
  children,
}: {
  title: string;
  Icon: IconComp;
  iconColor?: string;
  iconBg?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <div className="flex items-center gap-3 px-3.5 py-3.5">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: iconBg }}>
          <Icon size={20} color={iconColor} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] leading-5 font-bold" style={{ color: colors.text }}>
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t px-3.5 pt-3 pb-3.5" style={{ borderColor: colors.borderSoft }}>
        {children}
      </div>
    </div>
  );
}

export function PrivacyBullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <div className="flex items-start gap-2 pl-0.5">
      <span className="text-[14px] leading-[21px] font-bold" style={{ color: colors.accentBright }}>
        •
      </span>
      <p className="flex-1 text-[14px] leading-[21px] whitespace-pre-line" style={{ color: colors.textMuted }}>
        {text}
      </p>
    </div>
  );
}

export function PrivacySubheading({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <p className="mt-1 mb-0.5 text-[14px] font-bold whitespace-pre-line" style={{ color: colors.text }}>
      {text}
    </p>
  );
}

export function PrivacyParagraph({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <p className="text-[14px] leading-[21px] whitespace-pre-line" style={{ color: colors.textMuted }}>
      {text}
    </p>
  );
}
