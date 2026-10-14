"use client";

import { useState } from "react";
import { BookmarkIcon, ChatBubbleIcon, GalleryIcon, SearchIcon } from "@/components/icons";
import { DataManageRow } from "@/components/settings/DataManageRow";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

const ACTION_META = [
  {
    key: "chats",
    titleKey: "dataManage.chatsTitle",
    subtitleKey: "dataManage.chatsSub",
    modalTitleKey: "dataManage.chatsModalTitle",
    modalBodyKey: "dataManage.chatsModalBody",
    Icon: ChatBubbleIcon,
    iconColor: "#F87171",
    iconBg: "rgba(239, 68, 68, 0.16)",
  },
  {
    key: "searches",
    titleKey: "dataManage.searchesTitle",
    subtitleKey: "dataManage.searchesSub",
    modalTitleKey: "dataManage.searchesModalTitle",
    modalBodyKey: "dataManage.searchesModalBody",
    Icon: SearchIcon,
    iconColor: "#60A5FA",
    iconBg: "rgba(37, 99, 235, 0.18)",
  },
  {
    key: "media",
    titleKey: "dataManage.mediaTitle",
    subtitleKey: "dataManage.mediaSub",
    modalTitleKey: "dataManage.mediaModalTitle",
    modalBodyKey: "dataManage.mediaModalBody",
    Icon: GalleryIcon,
    iconColor: "#A78BFA",
    iconBg: "rgba(109, 40, 217, 0.18)",
  },
  {
    key: "favorites",
    titleKey: "dataManage.favoritesTitle",
    subtitleKey: "dataManage.favoritesSub",
    modalTitleKey: "dataManage.favoritesModalTitle",
    modalBodyKey: "dataManage.favoritesModalBody",
    Icon: BookmarkIcon,
    iconColor: "#F472B6",
    iconBg: "rgba(244, 114, 182, 0.16)",
  },
] as const;

export default function DataManagePage() {
  const { colors } = useTheme();
  const t = useT();
  const [ask, setAsk] = useState<(typeof ACTION_META)[number] | null>(null);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "calc(var(--tg-chrome, 0px) + var(--tg-safe-pad, max(10px, env(safe-area-inset-top))))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title={t("dataManage.title")} subtitle={t("dataManage.subtitle")} />
      <div className="mt-5 flex flex-col gap-3 px-4">
        {ACTION_META.map((item) => (
          <DataManageRow
            key={item.key}
            title={t(item.titleKey)}
            subtitle={t(item.subtitleKey)}
            Icon={item.Icon}
            iconColor={item.iconColor}
            iconBg={item.iconBg}
            onPress={() => setAsk(item)}
          />
        ))}
      </div>
      {ask ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
          <button type="button" className="absolute inset-0 border-0 bg-black/55" onClick={() => setAsk(null)} />
          <div className="relative w-full max-w-[360px] rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
            <p className="text-[16px] font-bold" style={{ color: colors.text }}>
              {t(ask.modalTitleKey)}
            </p>
            <p className="mt-2 text-[14px] leading-5" style={{ color: colors.textMuted }}>
              {t(ask.modalBodyKey)}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAsk(null)} className="rounded-xl px-4 py-2 text-[14px] font-semibold" style={{ color: colors.text }}>
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={() => setAsk(null)}
                className="rounded-xl px-4 py-2 text-[14px] font-semibold"
                style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
              >
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
