"use client";

import { ChevronRightIcon, LogoutIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

export function SettingsLogoutButton({ onPress }: { onPress?: () => void }) {
  const { isDark } = useTheme();
  const red = isDark ? "#F87171" : "#DC2626";
  const title = isDark ? "#FCA5A5" : "#B91C1C";

  return (
    <button
      type="button"
      onClick={onPress}
      className="mx-4 flex w-[calc(100%-32px)] items-center gap-3 rounded-[18px] border px-3.5 py-3.5 text-left"
      style={{
        backgroundColor: isDark ? "rgba(80, 20, 30, 0.45)" : "rgba(254, 226, 226, 0.95)",
        borderColor: isDark ? "rgba(248, 113, 113, 0.25)" : "rgba(220, 38, 38, 0.22)",
      }}
    >
      <span
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]"
        style={{ backgroundColor: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(220, 38, 38, 0.12)" }}
      >
        <LogoutIcon size={18} color={red} />
      </span>
      <span className="flex-1 text-[15px] font-semibold" style={{ color: title }}>
        Tizimdan chiqish
      </span>
      <ChevronRightIcon size={18} color={red} />
    </button>
  );
}
