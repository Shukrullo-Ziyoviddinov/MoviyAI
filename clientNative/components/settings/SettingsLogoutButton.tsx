import { ChevronRightIcon, LogoutIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsLogoutButtonProps = {
  onPress?: () => void;
};

export function SettingsLogoutButton({ onPress }: SettingsLogoutButtonProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const red = isDark ? '#F87171' : '#DC2626';
  const title = isDark ? '#FCA5A5' : '#B91C1C';

  return (
    <Pressable
      style={[
        styles.btn,
        {
          backgroundColor: isDark
            ? 'rgba(80, 20, 30, 0.45)'
            : 'rgba(254, 226, 226, 0.95)',
          borderColor: isDark
            ? 'rgba(248, 113, 113, 0.25)'
            : 'rgba(220, 38, 38, 0.22)',
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isDark
              ? 'rgba(239, 68, 68, 0.16)'
              : 'rgba(220, 38, 38, 0.12)',
          },
        ]}
      >
        <LogoutIcon size={18} color={red} />
      </View>
      <Text style={[styles.text, { color: title }]}>{t('common.logoutSystem')}</Text>
      <ChevronRightIcon size={18} color={red} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
