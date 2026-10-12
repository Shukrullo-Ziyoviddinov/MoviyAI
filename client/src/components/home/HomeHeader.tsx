"use client";

import { SearchIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/theme-state";

export function HomeHeader({ onSearchPress }: { onSearchPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const logo = isDark ? "/images/MY_preview_rev_1.png" : "/images/qoralogo_preview_rev_1.png";

  return (
    <div className="flex w-full items-center justify-between">
      <img src={logo} alt="" className="h-9 w-[108px] object-contain object-left md:h-11 md:w-[128px]" />
      <button
        type="button"
        aria-label="Qidiruv"
        onClick={onSearchPress}
        className="flex h-10 w-10 items-center justify-center rounded-full border md:h-[46px] md:w-[46px]"
        style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
      >
        <SearchIcon size={22} color={colors.icon} />
      </button>
    </div>
  );
}
