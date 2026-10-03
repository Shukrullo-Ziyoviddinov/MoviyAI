import { ChevronRightIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconComp = ComponentType<{ size?: number; color?: string }>;

type SettingsMenuRowProps = {
  title: string;
  subtitle?: string;
  Icon: IconComp;
  iconColor?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  danger?: boolean;
};

export function SettingsMenuRow({
  title,
  subtitle,
  Icon,
  iconColor = '#7DD3FC',
  value,
  onPress,
  right,
  showChevron = true,
  danger = false,
}: SettingsMenuRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={styles.iconBox}>
        <Icon size={18} color={danger ? '#F87171' : iconColor} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: danger ? '#FCA5A5' : colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {value ? (
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      ) : null}

      {right ? right : showChevron ? (
        <ChevronRightIcon size={18} color={danger ? '#F87171' : colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 60, 140, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(70, 120, 220, 0.28)',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
});
