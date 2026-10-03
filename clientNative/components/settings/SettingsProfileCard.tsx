import { ChevronRightIcon, PersonIcon } from '@/components/icons';
import { colors } from '@/constants/theme';
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
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <PersonIcon size={28} color={colors.icon} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
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
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
    borderWidth: 2,
    borderColor: 'rgba(120, 90, 255, 0.55)',
  },
  text: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
