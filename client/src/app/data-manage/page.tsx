"use client";

import { useState } from "react";
import { BookmarkIcon, ChatBubbleIcon, GalleryIcon, SearchIcon } from "@/components/icons";
import { DataManageRow } from "@/components/settings/DataManageRow";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useTheme } from "@/components/theme/theme-state";

const ACTIONS = [
  {
    key: "chats",
    title: "Suhbatlar tarixi",
    subtitle: "Barcha suhbatlarni o‘chirish",
    modalTitle: "Suhbatlar tarixi",
    modalBody: "Barcha suhbatlar o‘chiriladi. Bu amalni qaytarib bo‘lmaydi. Davom etasizmi?",
    Icon: ChatBubbleIcon,
    iconColor: "#F87171",
    iconBg: "rgba(239, 68, 68, 0.16)",
  },
  {
    key: "searches",
    title: "Qidiruv tarixi",
    subtitle: "Qidiruv tarixini tozalash",
    modalTitle: "Qidiruv tarixi",
    modalBody: "Qidiruv tarixi tozalanadi. Bu amalni qaytarib bo‘lmaydi. Davom etasizmi?",
    Icon: SearchIcon,
    iconColor: "#60A5FA",
    iconBg: "rgba(37, 99, 235, 0.18)",
  },
  {
    key: "media",
    title: "Yuklangan fayllar",
    subtitle: "Yuborilgan rasm va videolarni o‘chirish",
    modalTitle: "Yuklangan fayllar",
    modalBody: "Yuborilgan rasm va videolar o‘chiriladi. Bu amalni qaytarib bo‘lmaydi. Davom etasizmi?",
    Icon: GalleryIcon,
    iconColor: "#A78BFA",
    iconBg: "rgba(109, 40, 217, 0.18)",
  },
  {
    key: "favorites",
    title: "Saqlangan kinolar",
    subtitle: "Saqlangan/sevimli kinolarni o‘chirish",
    modalTitle: "Saqlangan kinolar",
    modalBody: "Saqlangan va sevimli kinolar o‘chiriladi. Bu amalni qaytarib bo‘lmaydi. Davom etasizmi?",
    Icon: BookmarkIcon,
    iconColor: "#F472B6",
    iconBg: "rgba(244, 114, 182, 0.16)",
  },
];

export default function DataManagePage() {
  const { colors } = useTheme();
  const [ask, setAsk] = useState<(typeof ACTIONS)[number] | null>(null);

  return (
    <div
      className="no-scrollbar h-full overflow-y-auto"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <SettingsHeader title="Ma'lumotlarni boshqarish" subtitle="Kesh, tarix va saqlangan ma'lumotlar" />
      <div className="mt-5 flex flex-col gap-3 px-4">
        {ACTIONS.map((item) => (
          <DataManageRow
            key={item.key}
            title={item.title}
            subtitle={item.subtitle}
            Icon={item.Icon}
            iconColor={item.iconColor}
            iconBg={item.iconBg}
            onPress={() => setAsk(item)}
          />
        ))}
      </div>
      {ask ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
          <button type="button" aria-label="Yopish" className="absolute inset-0 border-0 bg-black/55" onClick={() => setAsk(null)} />
          <div className="relative w-full max-w-[360px] rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
            <p className="text-[16px] font-bold" style={{ color: colors.text }}>
              {ask.modalTitle}
            </p>
            <p className="mt-2 text-[14px] leading-5" style={{ color: colors.textMuted }}>
              {ask.modalBody}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAsk(null)} className="rounded-xl px-4 py-2 text-[14px] font-semibold" style={{ color: colors.text }}>
                Yo‘q
              </button>
              <button
                type="button"
                onClick={() => setAsk(null)}
                className="rounded-xl px-4 py-2 text-[14px] font-semibold"
                style={{ backgroundColor: colors.accent, color: colors.textOnAccent }}
              >
                Ha
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
