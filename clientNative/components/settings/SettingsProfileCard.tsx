import { ChevronRightIcon, PersonIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsProfileCardProps = {
  name?: string;
  email?: string;
  onPress?: () => void;
};

export function SettingsProfileCard({
  name = 'Name:',
  email = 'Gmail:',
  onPress,
}: SettingsProfileCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: colors.panelSoft }]}>
        <PersonIcon size={28} color={colors.icon} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{email}</Text>
      </View>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(120, 90, 255, 0.55)',
  },
  text: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
  },
});
