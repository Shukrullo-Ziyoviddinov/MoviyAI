"use client";

import { useTheme } from "@/components/theme/theme-state";

export function TextMessageBubble({ text, role = "user" }: { text: string; role?: "user" | "model" }) {
  const { colors } = useTheme();

  if (role === "model") return <div className="mb-2.5 flex w-full justify-start px-3.5"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: colors.panelSoft, color: colors.text }}>{text}</div></div>;

  return (
    <div className="mb-2.5 flex w-full justify-end px-3.5">
      <div className="relative max-w-[min(78%,420px)]">
        <div
          className="rounded-tl-[18px] rounded-tr-[18px] rounded-br-none rounded-bl-[18px] px-3.5 py-2.5 text-[15px] leading-[21px]"
          style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
        >
          {text}
        </div>
        <svg
          className="absolute right-[-7px] bottom-0"
          width="12"
          height="16"
          viewBox="0 0 12 16"
          aria-hidden="true"
        >
          <path d="M0 0 C2 6 4 12 12 16 L0 16 Z" fill={colors.accent} />
        </svg>
      </div>
    </div>
  );
}
