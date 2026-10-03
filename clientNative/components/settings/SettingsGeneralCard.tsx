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
        subtitle={langLabel}
        Icon={GlobeIcon}
        onPress={openLanguageModal}
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
