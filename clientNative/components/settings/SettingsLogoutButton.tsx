import { ChevronRightIcon, LogoutIcon } from '@/components/icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SettingsLogoutButtonProps = {
  onPress?: () => void;
};

export function SettingsLogoutButton({ onPress }: SettingsLogoutButtonProps) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <View style={styles.iconBox}>
        <LogoutIcon size={18} color="#F87171" />
      </View>
      <Text style={styles.text}>Tizimdan chiqish</Text>
      <ChevronRightIcon size={18} color="#F87171" />
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
    backgroundColor: 'rgba(80, 20, 30, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  text: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '600',
  },
});
