import {
  BookmarkIcon,
  ChatBubbleIcon,
  GlobeIcon,
  LogoutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from '@/components/icons';
import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { ThemeToggle } from '@/components/profile/ThemeToggle';
import { useLanguageStore, LANGUAGE_OPTIONS } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { StyleSheet, View } from 'react-native';

type ProfileMenuCardProps = {
  onSavedMovies?: () => void;
  onSavedChats?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
};

export function ProfileMenuCard({
  onSavedMovies,
  onSavedChats,
  onSettings,
  onLogout,
}: ProfileMenuCardProps) {
  const { colors, isDark } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const openLanguageModal = useLanguageStore((s) => s.openModal);
  const langLabel =
    LANGUAGE_OPTIONS.find((o) => o.code === language)?.label ?? "O'zbekcha";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <ProfileMenuRow
        title="Saqlangan kinolar"
        subtitle="Sevimli kinolaringiz ro'yxati"
        Icon={BookmarkIcon}
        iconColor="#60A5FA"
        iconBg="rgba(37, 99, 235, 0.2)"
        onPress={onSavedMovies}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title="Saqlangan suhbatlar"
        subtitle="Oldingi AI suhbatlaringiz"
        Icon={ChatBubbleIcon}
        iconColor="#A78BFA"
        iconBg="rgba(109, 40, 217, 0.2)"
        onPress={onSavedChats}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title="Sozlamalar"
        subtitle="Ilovani sozlash"
        Icon={SettingsIcon}
        iconColor="#93C5FD"
        iconBg="rgba(59, 130, 246, 0.16)"
        onPress={onSettings}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title="Til"
        subtitle={langLabel}
        Icon={GlobeIcon}
        iconColor="#38BDF8"
        iconBg="rgba(14, 165, 233, 0.16)"
        onPress={openLanguageModal}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title="Tema"
        subtitle={isDark ? "Qorong'i" : "Yorug'"}
        Icon={isDark ? MoonIcon : SunIcon}
        iconColor="#C4B5FD"
        iconBg="rgba(124, 58, 237, 0.18)"
        showChevron={false}
        right={<ThemeToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title="Chiqish"
        subtitle="Hisobingizdan chiqish"
        Icon={LogoutIcon}
        iconColor="#F87171"
        iconBg="rgba(239, 68, 68, 0.16)"
        danger
        onPress={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: 66,
  },
});
