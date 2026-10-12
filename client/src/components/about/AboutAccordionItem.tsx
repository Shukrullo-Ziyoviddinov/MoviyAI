"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

type IconComp = (props: { size?: number; color?: string }) => ReactNode;

export function AboutAccordionItem({
  title,
  body,
  Icon,
  iconColor = "#60A5FA",
  iconBg = "rgba(37, 99, 235, 0.18)",
  defaultOpen = false,
}: {
  title: string;
  body: string;
  Icon: IconComp;
  iconColor?: string;
  iconBg?: string;
  defaultOpen?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: iconBg }}>
          <Icon size={20} color={iconColor} />
        </span>
        <span className="min-w-0 flex-1 text-[15px] leading-5 font-semibold" style={{ color: colors.text }}>
          {title}
        </span>
        <span className="transition-transform duration-[280ms] ease-out" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronDownIcon size={18} color={colors.textMuted} />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-[280ms] ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p
            className="border-t px-3.5 pt-3 pb-3.5 text-[14px] leading-[21px] whitespace-pre-line"
            style={{ borderColor: colors.borderSoft, color: colors.textMuted }}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AboutAccordionList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 px-4">{children}</div>;
}
