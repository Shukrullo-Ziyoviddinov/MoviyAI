import { useTheme } from '@/src/stores/useThemeStore';
import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SkeletonLoaderProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bone,
        {
          ...(width != null ? { width } : null),
          ...(height != null ? { height } : null),
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.10)',
        },
        pulse,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bone: {
    overflow: 'hidden',
  },
});
