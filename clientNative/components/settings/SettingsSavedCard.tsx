import { BookmarkIcon, ChatBubbleIcon } from '@/components/icons';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { useTheme } from '@/src/stores/useThemeStore';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <SettingsMenuRow
        title={t('settings.savedMovies')}
        subtitle={t('settings.savedMoviesSub')}
        Icon={BookmarkIcon}
        value={String(moviesCount)}
        onPress={onMovies}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />
      <SettingsMenuRow
        title={t('settings.savedChats')}
        subtitle={t('settings.savedChatsSub')}
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
});
