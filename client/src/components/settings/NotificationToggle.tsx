"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/theme-state";

export function NotificationToggle() {
  const { colors } = useTheme();
  const [on, setOn] = useState(true);

  return (
    <button
      type="button"
      aria-label="Bildirishnomalar"
      onClick={() => setOn((value) => !value)}
      className="flex h-7 w-12 items-center rounded-full px-[3px]"
      style={{
        backgroundColor: on ? "rgba(91, 75, 255, 0.85)" : "rgba(60, 70, 100, 0.55)",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span className="h-[22px] w-[22px] rounded-full" style={{ backgroundColor: on ? "#F3F0FF" : colors.textMuted }} />
    </button>
  );
}
