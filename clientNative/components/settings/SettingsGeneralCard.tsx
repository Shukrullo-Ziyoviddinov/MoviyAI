import {
  CloudIcon,
  GlobeIcon,
  HelpIcon,
  InfoIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  ShieldIcon,
} from '@/components/icons';
import { ThemeToggle } from '@/components/profile/ThemeToggle';
import { NotificationToggle } from '@/components/settings/NotificationToggle';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { useLanguageStore, LANGUAGE_OPTIONS } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

type SettingsGeneralCardProps = {
  onPrivacy?: () => void;
  onData?: () => void;
  onHelp?: () => void;
  onAbout?: () => void;
};

export function SettingsGeneralCard({
  onPrivacy,
  onData,
  onHelp,
  onAbout,
}: SettingsGeneralCardProps) {
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
      <SettingsMenuRow
        title={t('settings.notifications')}
        subtitle={t('settings.notificationsSub')}
        Icon={BellIcon}
        showChevron={false}
        right={<NotificationToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('common.language')}
        subtitle={langLabel}
        Icon={GlobeIcon}
        onPress={openLanguageModal}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('common.theme')}
        subtitle={isDark ? t('common.themeDark') : t('common.themeLight')}
        Icon={isDark ? MoonIcon : SunIcon}
        showChevron={false}
        right={<ThemeToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('settings.privacy')}
        Icon={ShieldIcon}
        onPress={onPrivacy}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('settings.data')}
        subtitle={t('settings.dataSub')}
        Icon={CloudIcon}
        onPress={onData}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('settings.help')}
        Icon={HelpIcon}
        onPress={onHelp}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('settings.about')}
        Icon={InfoIcon}
        onPress={onAbout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
});
