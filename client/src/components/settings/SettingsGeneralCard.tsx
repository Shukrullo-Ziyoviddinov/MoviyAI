"use client";

import { BellIcon, CloudIcon, GlobeIcon, HelpIcon, InfoIcon, MoonIcon, ShieldIcon, SunIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { useLanguage } from "@/components/language/language-state";
import { NotificationToggle } from "@/components/settings/NotificationToggle";
import { SettingsMenuRow } from "@/components/settings/SettingsMenuRow";
import { useTheme } from "@/components/theme/theme-state";

export function SettingsGeneralCard({
  onPrivacy,
  onData,
  onAbout,
}: {
  onPrivacy?: () => void;
  onData?: () => void;
  onAbout?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { label, openModal } = useLanguage();

  return (
    <div className="mx-4 overflow-hidden rounded-[18px] border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <SettingsMenuRow
        title="Bildirishnomalar"
        subtitle="Yangiliklar va eslatmalar"
        Icon={BellIcon}
        showChevron={false}
        right={<NotificationToggle />}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Til" subtitle={label} Icon={GlobeIcon} onPress={openModal} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow
        title="Tema"
        subtitle={isDark ? "Qorong'i" : "Yorug'"}
        Icon={isDark ? MoonIcon : SunIcon}
        showChevron={false}
        right={<ThemeToggle />}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Maxfiylik va xavfsizlik" Icon={ShieldIcon} onPress={onPrivacy} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Ma'lumotlarni boshqarish" subtitle="Kesh va saqlash" Icon={CloudIcon} onPress={onData} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Yordam va qo'llab-quvvatlash" Icon={HelpIcon} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title="Ilova haqida" Icon={InfoIcon} onPress={onAbout} />
    </div>
  );
}
