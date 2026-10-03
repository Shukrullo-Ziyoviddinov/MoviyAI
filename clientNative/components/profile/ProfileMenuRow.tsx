import { ChevronRightIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconComp = ComponentType<{ size?: number; color?: string }>;

type ProfileMenuRowProps = {
  title: string;
  subtitle: string;
  Icon: IconComp;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  right?: ReactNode;
  showChevron?: boolean;
  danger?: boolean;
};

export function ProfileMenuRow({
  title,
  subtitle,
  Icon,
  iconColor = '#7DD3FC',
  iconBg = 'rgba(56, 120, 220, 0.18)',
  onPress,
  right,
  showChevron = true,
  danger = false,
}: ProfileMenuRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress && !right}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={danger ? '#F87171' : iconColor} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: danger ? '#FCA5A5' : colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>

      {right ? right : showChevron ? (
        <ChevronRightIcon size={18} color={colors.textMuted} />
      ) : null}
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
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});
