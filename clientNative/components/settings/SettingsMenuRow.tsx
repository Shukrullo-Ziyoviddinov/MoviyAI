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
  iconColor,
  value,
  onPress,
  right,
  showChevron = true,
  danger = false,
}: SettingsMenuRowProps) {
  const { colors, isDark } = useTheme();
  const resolvedIcon = danger
    ? isDark
      ? '#F87171'
      : '#DC2626'
    : iconColor ?? colors.accent;
  const dangerTitle = isDark ? '#FCA5A5' : '#B91C1C';

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isDark
              ? 'rgba(30, 60, 140, 0.22)'
              : 'rgba(30, 79, 214, 0.1)',
            borderColor: isDark
              ? 'rgba(70, 120, 220, 0.28)'
              : 'rgba(30, 79, 214, 0.22)',
          },
        ]}
      >
        <Icon size={18} color={resolvedIcon} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: danger ? dangerTitle : colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {value ? (
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      ) : null}

      {right ? (
        right
      ) : showChevron ? (
        <ChevronRightIcon
          size={18}
          color={danger ? resolvedIcon : colors.textMuted}
        />
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
    borderWidth: 1,
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
