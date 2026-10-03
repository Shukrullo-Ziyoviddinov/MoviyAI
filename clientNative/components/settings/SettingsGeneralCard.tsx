import {
  CloudIcon,
  GlobeIcon,
  HelpIcon,
  InfoIcon,
  MoonIcon,
  BellIcon,
  ShieldIcon,
} from '@/components/icons';
import { NotificationToggle } from '@/components/settings/NotificationToggle';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { colors } from '@/constants/theme';
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
  onTheme,
  onPrivacy,
  onData,
  onHelp,
  onAbout,
}: SettingsGeneralCardProps) {
  return (
    <View style={styles.card}>
      <SettingsMenuRow
        title="Bildirishnomalar"
        subtitle="Yangiliklar va eslatmalar"
        Icon={BellIcon}
        showChevron={false}
        right={<NotificationToggle />}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Til"
        subtitle="O'zbekcha"
        Icon={GlobeIcon}
        onPress={onLanguage}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Tema"
        subtitle="Qorong'i"
        Icon={MoonIcon}
        onPress={onTheme}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Maxfiylik va xavfsizlik"
        Icon={ShieldIcon}
        onPress={onPrivacy}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Ma'lumotlarni boshqarish"
        subtitle="Kesh va saqlash"
        Icon={CloudIcon}
        onPress={onData}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Yordam va qo'llab-quvvatlash"
        Icon={HelpIcon}
        onPress={onHelp}
      />
      <View style={styles.divider} />
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
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginLeft: 64,
  },
});
