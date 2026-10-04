import { ChevronRightIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DataManageRowProps = {
  title: string;
  subtitle: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
};

export function DataManageRow({
  title,
  subtitle,
  Icon,
  iconColor = '#60A5FA',
  iconBg = 'rgba(37, 99, 235, 0.18)',
  onPress,
}: DataManageRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
