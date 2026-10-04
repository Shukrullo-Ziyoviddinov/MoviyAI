import { ChatBubbleIcon, HeartIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type FavoritesEmptyStateProps = {
  onGoToChat?: () => void;
};

export function FavoritesEmptyState({ onGoToChat }: FavoritesEmptyStateProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark
              ? 'rgba(244, 114, 182, 0.14)'
              : 'rgba(244, 114, 182, 0.1)',
            borderColor: colors.borderSoft,
          },
        ]}
      >
        <HeartIcon size={44} color="#F472B6" />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {t('favorites.emptyTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('favorites.emptySubtitle')}
      </Text>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={onGoToChat}
      >
        <ChatBubbleIcon size={18} color={colors.textOnAccent} />
        <Text style={[styles.btnText, { color: colors.textOnAccent }]}>
          {t('favorites.goToChat')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  btn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
