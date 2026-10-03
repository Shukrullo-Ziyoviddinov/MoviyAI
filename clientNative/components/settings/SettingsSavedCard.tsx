import { BookmarkIcon, ChatBubbleIcon } from '@/components/icons';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { colors } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

type SettingsSavedCardProps = {
  moviesCount?: number;
  chatsCount?: number;
  onMovies?: () => void;
  onChats?: () => void;
};

export function SettingsSavedCard({
  moviesCount = 12,
  chatsCount = 18,
  onMovies,
  onChats,
}: SettingsSavedCardProps) {
  return (
    <View style={styles.card}>
      <SettingsMenuRow
        title="Saqlangan kinolar"
        subtitle="Sevimli filmlaringiz ro'yxati"
        Icon={BookmarkIcon}
        value={String(moviesCount)}
        onPress={onMovies}
      />
      <View style={styles.divider} />
      <SettingsMenuRow
        title="Saqlangan suhbatlar"
        subtitle="Oldingi AI suhbatlaringiz"
        Icon={ChatBubbleIcon}
        value={String(chatsCount)}
        onPress={onChats}
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
