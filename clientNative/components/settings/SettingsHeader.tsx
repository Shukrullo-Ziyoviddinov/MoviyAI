import { ChevronLeftIcon } from '@/components/icons';
import { colors } from '@/constants/theme';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsHeaderProps = {
  onBack?: () => void;
};

export function SettingsHeader({ onBack }: SettingsHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.backBtn}
        onPress={onBack ?? (() => router.back())}
      >
        <ChevronLeftIcon size={20} color={colors.icon} />
      </Pressable>

      <Text style={styles.title}>Sozlamalar</Text>
      <Text style={styles.subtitle}>Ilovangizni o'zingizga moslab sozlang</Text>
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
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
