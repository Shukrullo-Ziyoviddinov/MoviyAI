"use client";

import { useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { SearchModal, type SearchOrigin } from "@/components/search/SearchModal";
import { useTheme } from "@/components/theme/theme-state";

export function HomeHeader({ onSearchPress }: { onSearchPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const logo = isDark ? "/images/MY_preview_rev_1.png" : "/images/qoralogo_preview_rev_1.png";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<SearchOrigin | null>(null);

  function openSearch() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setOpen(true);
    onSearchPress?.();
  }

  return (
    <div className="flex w-full items-center justify-between">
      <img src={logo} alt="" className="h-9 w-[108px] object-contain object-left md:hidden" />
      <button
        ref={buttonRef}
        type="button"
        aria-label="Qidiruv"
        onClick={openSearch}
        className="flex h-10 w-10 items-center justify-center rounded-full border md:ml-auto"
        style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
      >
        <SearchIcon size={22} color={colors.icon} />
      </button>
      <SearchModal open={open} origin={origin} onClose={() => setOpen(false)} />
    </div>
  );
}
