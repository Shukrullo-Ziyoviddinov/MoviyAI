"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      aria-label="Tema"
      onClick={toggle}
      className="relative h-[30px] w-[52px] rounded-full"
      style={{ backgroundColor: isDark ? "rgba(91, 75, 255, 0.45)" : "rgba(245, 158, 11, 0.35)" }}
    >
      <span
        className="absolute top-[3px] left-[3px] flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-[260ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
        style={{
          transform: isDark ? "translateX(22px)" : "translateX(0)",
          backgroundColor: isDark ? "#3B2F8A" : "#FEF3C7",
        }}
      >
        {isDark ? <MoonIcon size={14} color="#E8E4FF" /> : <SunIcon size={14} color="#F59E0B" />}
      </span>
    </button>
  );
}
