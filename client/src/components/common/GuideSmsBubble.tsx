"use client";

import { colors } from "@/constants/theme";

export function GuideSmsBubble({
  text,
  gotItLabel,
  onGotIt,
}: {
  text: string;
  gotItLabel: string;
  onGotIt: () => void;
}) {
  return (
    <div className="pointer-events-none mx-auto w-full max-w-[430px] md:max-w-[560px]">
      <div className="pointer-events-auto flex flex-col rounded-2xl px-3.5 py-3" style={{ backgroundColor: colors.accent }}>
        <p className="text-sm leading-5 font-medium" style={{ color: colors.textOnAccent }}>
          {text}
        </p>
        <button
          type="button"
          onClick={onGotIt}
          className="mt-3 self-end rounded-[14px] px-3.5 py-2 text-sm font-bold"
          style={{ backgroundColor: "rgba(255,255,255,0.18)", color: colors.textOnAccent }}
        >
          {gotItLabel}
        </button>
      </div>
      <div className="ml-7 h-0 w-0 border-x-[9px] border-t-[10px] border-x-transparent" style={{ borderTopColor: colors.accent }} />
    </div>
  );
}
