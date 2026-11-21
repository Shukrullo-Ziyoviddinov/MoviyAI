import { useTheme } from '@/src/stores/useThemeStore';
import { useContext } from 'react';
import { SkeletonGroupContext, useSkeletonAnimation } from './SkeletonPulse';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

type SkeletonLoaderProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonLoader(props: SkeletonLoaderProps) {
  const grouped = useContext(SkeletonGroupContext);
  return grouped ? <Bone {...props} /> : <AnimatedBone {...props} />;
}

function AnimatedBone(props: SkeletonLoaderProps) {
  const pulse = useSkeletonAnimation();
  return <Bone {...props} pulse={pulse} />;
}

function Bone({ width, height, borderRadius = 8, style, pulse }: SkeletonLoaderProps & { pulse?: ReturnType<typeof useSkeletonAnimation> }) {
  const { isDark } = useTheme();
  const base = [
      styles.bone,
      { ...(width != null ? { width } : null), ...(height != null ? { height } : null), borderRadius,
        backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.10)' },
      style,
    ];
  return pulse ? <Animated.View pointerEvents="none" style={[base, pulse]} /> : <View pointerEvents="none" style={base} />;
}

const styles = StyleSheet.create({ bone: { overflow: 'hidden' } });
