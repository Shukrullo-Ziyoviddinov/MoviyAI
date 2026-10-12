"use client";

import { useState } from "react";
import { ChevronRightIcon, PersonIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

export function SettingsProfileCard({
  name,
  email,
  picture,
  onPress,
}: {
  name: string;
  email: string;
  picture?: string | null;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const photo = picture?.trim() || "";
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onPress}
      className="mx-4 flex w-[calc(100%-32px)] items-center gap-3 rounded-[18px] border px-3.5 py-3.5 text-left"
      style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}
    >
      <span
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
        style={{ backgroundColor: colors.panelSoft, borderColor: "rgba(120, 90, 255, 0.55)" }}
      >
        {photo && !failed ? (
          <img src={photo} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <PersonIcon size={28} color={colors.icon} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-bold" style={{ color: colors.text }}>
          {name}
        </span>
        <span className="mt-[3px] block truncate text-[13px]" style={{ color: colors.textMuted }}>
          {email}
        </span>
      </span>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </button>
  );
}
