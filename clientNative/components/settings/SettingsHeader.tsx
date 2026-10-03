import { ChevronLeftIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsHeaderProps = {
  onBack?: () => void;
};

export function SettingsHeader({ onBack }: SettingsHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.backBtn,
          { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
        ]}
        onPress={onBack ?? (() => router.back())}
      >
        <ChevronLeftIcon size={20} color={colors.icon} />
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('settings.subtitle')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
});
