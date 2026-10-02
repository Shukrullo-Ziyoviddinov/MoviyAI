import { MenuIcon, PersonIcon } from '@/components/icons';
import { colors } from '@/constants/theme';
import { Pressable, StyleSheet, View } from 'react-native';

export function ChatHeader() {
  return (
    <View style={styles.row}>
      <Pressable style={styles.circleBtn} onPress={() => undefined}>
        <MenuIcon size={22} color={colors.icon} />
      </Pressable>

      <Pressable style={styles.circleBtn} onPress={() => undefined}>
        <PersonIcon size={20} color={colors.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
