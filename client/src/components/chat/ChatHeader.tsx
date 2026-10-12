"use client";

import { CloseIcon, DownloadIcon, MenuIcon, PersonIcon } from "@/components/icons";
import { useChat } from "@/components/chat/chat-state";
import { colors } from "@/constants/theme";

export const HEADER_ROW_HEIGHT = 62;

const circle = "flex h-11 w-11 items-center justify-center rounded-full border-[1.5px]";

export function ChatHeader() {
  const { viewer, closeViewer } = useChat();

  function download() {
    if (!viewer) return;
    const link = document.createElement("a");
    link.href = viewer.uri;
    link.download = viewer.type === "video" ? "video" : "image";
    link.click();
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="flex h-[62px] items-center justify-between px-4">
        <button
          type="button"
          aria-label={viewer ? "Yopish" : "Menyu"}
          onClick={viewer ? closeViewer : undefined}
          className={`${circle} pointer-events-auto`}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.border }}
        >
          {viewer ? <CloseIcon size={22} color={colors.icon} /> : <MenuIcon size={22} color={colors.icon} />}
        </button>
        <button
          type="button"
          aria-label={viewer ? "Yuklab olish" : "Profil"}
          onClick={viewer ? download : undefined}
          className={`${circle} pointer-events-auto`}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.border }}
        >
          {viewer ? <DownloadIcon size={20} color={colors.icon} /> : <PersonIcon size={20} color={colors.icon} />}
        </button>
      </div>
    </div>
  );
}
