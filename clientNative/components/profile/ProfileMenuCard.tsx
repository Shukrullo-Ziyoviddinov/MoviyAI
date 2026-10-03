import {
  BookmarkIcon,
  ChatBubbleIcon,
  GlobeIcon,
  LogoutIcon,
  MoonIcon,
  SettingsIcon,
} from '@/components/icons';
import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { ThemeToggle } from '@/components/profile/ThemeToggle';
import { colors } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

type ProfileMenuCardProps = {
  onSavedMovies?: () => void;
  onSavedChats?: () => void;
  onSettings?: () => void;
  onLanguage?: () => void;
  onLogout?: () => void;
};

export function ProfileMenuCard({
  onSavedMovies,
  onSavedChats,
  onSettings,
  onLanguage,
  onLogout,
}: ProfileMenuCardProps) {
  return (
    <View style={styles.card}>
      <ProfileMenuRow
        title="Saqlangan kinolar"
        subtitle="Sevimli kinolaringiz ro'yxati"
        Icon={BookmarkIcon}
        iconColor="#60A5FA"
        iconBg="rgba(37, 99, 235, 0.2)"
        onPress={onSavedMovies}
      />
      <View style={styles.divider} />

      <ProfileMenuRow
        title="Saqlangan suhbatlar"
        subtitle="Oldingi AI suhbatlaringiz"
        Icon={ChatBubbleIcon}
        iconColor="#A78BFA"
        iconBg="rgba(109, 40, 217, 0.2)"
        onPress={onSavedChats}
      />
      <View style={styles.divider} />

      <ProfileMenuRow
        title="Sozlamalar"
        subtitle="Ilovani sozlash"
        Icon={SettingsIcon}
        iconColor="#93C5FD"
        iconBg="rgba(59, 130, 246, 0.16)"
        onPress={onSettings}
      />
      <View style={styles.divider} />

      <ProfileMenuRow
        title="Til"
        subtitle="O'zbekcha"
        Icon={GlobeIcon}
        iconColor="#38BDF8"
        iconBg="rgba(14, 165, 233, 0.16)"
        onPress={onLanguage}
      />
      <View style={styles.divider} />

      <ProfileMenuRow
        title="Tema"
        subtitle="Qorong'i"
        Icon={MoonIcon}
        iconColor="#C4B5FD"
        iconBg="rgba(124, 58, 237, 0.18)"
        showChevron={false}
        right={<ThemeToggle />}
      />
      <View style={styles.divider} />

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
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginLeft: 66,
  },
});
