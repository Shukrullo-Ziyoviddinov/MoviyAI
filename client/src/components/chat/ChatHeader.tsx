"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-state";
import { CloseIcon, DownloadIcon, MenuIcon, PersonIcon } from "@/components/icons";
import { useChat } from "@/components/chat/chat-state";
import { useSideMenu } from "@/components/menu/SideMenu";
import { useTelegramChrome } from "@/components/telegram/TelegramFullscreen";
import { colors } from "@/constants/theme";

export const HEADER_ROW_HEIGHT = 62;

const circle = "flex h-11 w-11 items-center justify-center rounded-full border-[1.5px]";

export function ChatHeader() {
  const router = useRouter();
  const { profile } = useAuth();
  const { viewer, closeViewer } = useChat();
  const { desktopOpen, openMenu } = useSideMenu();
  const { active: telegram } = useTelegramChrome();
  const [photoFailed, setPhotoFailed] = useState(false);
  const picture = profile?.picture?.trim() || "";

  function download() {
    if (!viewer) return;
    const link = document.createElement("a");
    link.href = viewer.uri;
    link.download = viewer.type === "video" ? "video" : "image";
    link.click();
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-40"
      style={{ top: "var(--tg-chrome, 0px)", paddingTop: telegram ? 0 : "env(safe-area-inset-top)" }}
    >
      <div className="flex h-[62px] items-center justify-between px-4">
        <button
          type="button"
          aria-label={viewer ? "Yopish" : "Menyu"}
          onClick={viewer ? closeViewer : openMenu}
          className={`${circle} pointer-events-auto ${
            !viewer && desktopOpen ? "md:pointer-events-none md:invisible" : ""
          }`}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.border }}
        >
          {viewer ? <CloseIcon size={22} color={colors.icon} /> : <MenuIcon size={22} color={colors.icon} />}
        </button>
        <button
          type="button"
          aria-label={viewer ? "Yuklab olish" : "Profil"}
          onClick={viewer ? download : () => router.push("/profile")}
          className={`${circle} pointer-events-auto overflow-hidden`}
          style={{ backgroundColor: colors.panelSoft, borderColor: colors.border }}
        >
          {viewer ? (
            <DownloadIcon size={20} color={colors.icon} />
          ) : picture && !photoFailed ? (
            <img
              src={picture}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <PersonIcon size={20} color={colors.icon} />
          )}
        </button>
      </div>
    </div>
  );
}
