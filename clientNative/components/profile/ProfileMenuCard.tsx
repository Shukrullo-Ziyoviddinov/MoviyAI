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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const openLanguageModal = useLanguageStore((s) => s.openModal);
  const langLabel =
    t(LANGUAGE_OPTIONS.find((o) => o.code === language)?.labelKey ?? 'language.uz');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <ProfileMenuRow
        title={t('profile.savedMovies')}
        subtitle={t('profile.savedMoviesSub')}
        Icon={BookmarkIcon}
        iconColor="#60A5FA"
        iconBg="rgba(37, 99, 235, 0.2)"
        onPress={onSavedMovies}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title={t('profile.savedChats')}
        subtitle={t('profile.savedChatsSub')}
        Icon={ChatBubbleIcon}
        iconColor="#A78BFA"
        iconBg="rgba(109, 40, 217, 0.2)"
        onPress={onSavedChats}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title={t('profile.settings')}
        subtitle={t('profile.settingsSub')}
        Icon={SettingsIcon}
        iconColor="#93C5FD"
        iconBg="rgba(59, 130, 246, 0.16)"
        onPress={onSettings}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title={t('common.language')}
        subtitle={langLabel}
        Icon={GlobeIcon}
        iconColor="#38BDF8"
        iconBg="rgba(14, 165, 233, 0.16)"
        onPress={openLanguageModal}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title={t('common.theme')}
        subtitle={isDark ? t('common.themeDark') : t('common.themeLight')}
        Icon={isDark ? MoonIcon : SunIcon}
        iconColor="#C4B5FD"
        iconBg="rgba(124, 58, 237, 0.18)"
        showChevron={false}
        right={<ThemeToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

      <ProfileMenuRow
        title={t('common.logout')}
        subtitle={t('profile.logoutSub')}
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
