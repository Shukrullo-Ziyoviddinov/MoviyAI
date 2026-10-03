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
import { useTheme } from '@/src/stores/useThemeStore';
import { StyleSheet, View } from 'react-native';

type SettingsGeneralCardProps = {
  onLanguage?: () => void;
  onTheme?: () => void;
  onPrivacy?: () => void;
  onData?: () => void;
  onHelp?: () => void;
  onAbout?: () => void;
};

export function SettingsGeneralCard({
  onLanguage,
  onPrivacy,
  onData,
  onHelp,
  onAbout,
}: SettingsGeneralCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <SettingsMenuRow
        title="Bildirishnomalar"
        subtitle="Yangiliklar va eslatmalar"
        Icon={BellIcon}
        showChevron={false}
        right={<NotificationToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Til"
        subtitle="O'zbekcha"
        Icon={GlobeIcon}
        onPress={onLanguage}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Tema"
        subtitle={isDark ? "Qorong'i" : "Yorug'"}
        Icon={isDark ? MoonIcon : SunIcon}
        showChevron={false}
        right={<ThemeToggle />}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Maxfiylik va xavfsizlik"
        Icon={ShieldIcon}
        onPress={onPrivacy}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Ma'lumotlarni boshqarish"
        subtitle="Kesh va saqlash"
        Icon={CloudIcon}
        onPress={onData}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Yordam va qo'llab-quvvatlash"
        Icon={HelpIcon}
        onPress={onHelp}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title="Ilova haqida"
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
