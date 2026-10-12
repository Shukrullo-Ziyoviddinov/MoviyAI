"use client";

import { BookmarkIcon, ChatBubbleIcon, GlobeIcon, LogoutIcon, MoonIcon, SettingsIcon, SunIcon } from "@/components/icons";
import { ProfileMenuRow } from "@/components/profile/ProfileMenuRow";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { useLanguage } from "@/components/language/language-state";
import { useTheme } from "@/components/theme/theme-state";

export function ProfileMenuCard({
  onSavedMovies,
  onSettings,
  onLogout,
}: {
  onSavedMovies?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { label, openModal } = useLanguage();

  return (
    <div className="mx-4 overflow-hidden rounded-[22px] border" style={{ backgroundColor: colors.panel, borderColor: colors.borderSoft }}>
      <ProfileMenuRow
        title="Saqlangan kinolar"
        subtitle="Sevimli kinolaringiz ro'yxati"
        Icon={BookmarkIcon}
        iconColor="#60A5FA"
        iconBg="rgba(37, 99, 235, 0.2)"
        onPress={onSavedMovies}
      />
      <div className="ml-[66px] h-px" style={{ backgroundColor: colors.borderSoft }} />
      <ProfileMenuRow
        title="Saqlangan suhbatlar"
        subtitle="Oldingi AI suhbatlaringiz"
        Icon={ChatBubbleIcon}
        iconColor="#A78BFA"
        iconBg="rgba(109, 40, 217, 0.2)"
      />
      <div className="ml-[66px] h-px" style={{ backgroundColor: colors.borderSoft }} />
      <ProfileMenuRow
        title="Sozlamalar"
        subtitle="Ilovani sozlash"
        Icon={SettingsIcon}
        iconColor="#93C5FD"
        iconBg="rgba(59, 130, 246, 0.16)"
        onPress={onSettings}
      />
      <div className="ml-[66px] h-px" style={{ backgroundColor: colors.borderSoft }} />
      <ProfileMenuRow
        title="Til"
        subtitle={label}
        Icon={GlobeIcon}
        iconColor="#38BDF8"
        iconBg="rgba(14, 165, 233, 0.16)"
        onPress={openModal}
      />
      <div className="ml-[66px] h-px" style={{ backgroundColor: colors.borderSoft }} />
      <ProfileMenuRow
        title="Tema"
        subtitle={isDark ? "Qorong'i" : "Yorug'"}
        Icon={isDark ? MoonIcon : SunIcon}
        iconColor="#C4B5FD"
        iconBg="rgba(124, 58, 237, 0.18)"
        showChevron={false}
        right={<ThemeToggle />}
      />
      <div className="ml-[66px] h-px" style={{ backgroundColor: colors.borderSoft }} />
      <ProfileMenuRow
        title="Chiqish"
        subtitle="Hisobingizdan chiqish"
        Icon={LogoutIcon}
        iconColor="#F87171"
        iconBg="rgba(239, 68, 68, 0.16)"
        danger
        onPress={onLogout}
      />
    </div>
  );
}
