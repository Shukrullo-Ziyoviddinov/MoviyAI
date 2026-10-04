import { ChevronDownIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ANIM_MS = 280;

type AboutAccordionItemProps = {
  title: string;
  body: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  iconBg?: string;
  defaultOpen?: boolean;
};

export function AboutAccordionItem({
  title,
  body,
  Icon,
  iconColor = '#60A5FA',
  iconBg = 'rgba(37, 99, 235, 0.18)',
  defaultOpen = false,
}: AboutAccordionItemProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [contentH, setContentH] = useState(0);

  const progress = useSharedValue(defaultOpen ? 1 : 0);
  const measuredH = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, progress]);

  const toggle = () => setOpen((v) => !v);

  const bodyStyle = useAnimatedStyle(() => ({
    height: measuredH.value * progress.value,
    opacity: progress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.borderSoft },
      ]}
    >
      <Pressable style={styles.header} onPress={toggle}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <ChevronDownIcon size={18} color={colors.textMuted} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.bodyClip, bodyStyle]}>
        <View
          style={[styles.body, { borderTopColor: colors.borderSoft }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== contentH) {
              setContentH(h);
              measuredH.value = h;
            }
          }}
        >
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>{body}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

type AboutAccordionListProps = {
  children: ReactNode;
};

export function AboutAccordionList({ children }: AboutAccordionListProps) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bodyClip: {
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
