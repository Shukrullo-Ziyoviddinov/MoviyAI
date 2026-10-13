"use client";

import { BellIcon, CloudIcon, GlobeIcon, HelpIcon, InfoIcon, MoonIcon, ShieldIcon, SunIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { useLanguage } from "@/components/language/language-state";
import { NotificationToggle } from "@/components/settings/NotificationToggle";
import { SettingsMenuRow } from "@/components/settings/SettingsMenuRow";
import { useTheme } from "@/components/theme/theme-state";
import { useT } from "@/i18n/useT";

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
  const t = useT();

  return (
    <div className="mx-4 overflow-hidden rounded-[18px] border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <SettingsMenuRow
        title={t("settings.notifications")}
        subtitle={t("settings.notificationsSub")}
        Icon={BellIcon}
        showChevron={false}
        right={<NotificationToggle />}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("common.language")} subtitle={label} Icon={GlobeIcon} onPress={openModal} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow
        title={t("common.theme")}
        subtitle={isDark ? t("common.themeDark") : t("common.themeLight")}
        Icon={isDark ? MoonIcon : SunIcon}
        showChevron={false}
        right={<ThemeToggle />}
      />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("settings.privacy")} Icon={ShieldIcon} onPress={onPrivacy} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("settings.data")} subtitle={t("settings.dataSub")} Icon={CloudIcon} onPress={onData} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("settings.help")} Icon={HelpIcon} />
      <div className="ml-16 h-px" style={{ backgroundColor: colors.borderSoft }} />
      <SettingsMenuRow title={t("settings.about")} Icon={InfoIcon} onPress={onAbout} />
    </div>
  );
}
