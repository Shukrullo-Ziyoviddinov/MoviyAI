import { MoonIcon, SunIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const TRACK_W = 52;
const THUMB = 24;
const PAD = 3;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isDark, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(245, 158, 11, 0.35)', 'rgba(91, 75, 255, 0.45)']
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#FEF3C7', '#3B2F8A']
    ),
  }));

  return (
    <Pressable onPress={toggle} hitSlop={6}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          {isDark ? (
            <MoonIcon size={14} color="#E8E4FF" />
          ) : (
            <SunIcon size={14} color="#F59E0B" />
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: PAD,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
