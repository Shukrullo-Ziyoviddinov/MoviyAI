import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const LOGO = require('../assets/images/MY_preview_rev_1.png');

type SplashScreenProps = {
  onFinish?: () => void;
  durationMs?: number;
};

export function SplashScreen({ onFinish, durationMs = 2200 }: SplashScreenProps) {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.42, 196);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    const fadeIn = 700;
    const fadeOut = 350;
    const hold = Math.max(durationMs - fadeIn, 600);

    opacity.value = withSequence(
      withTiming(1, { duration: fadeIn, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: hold }),
      withTiming(0, { duration: fadeOut, easing: Easing.in(Easing.quad) })
    );
    scale.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    const timer = setTimeout(() => {
      onFinish?.();
    }, fadeIn + hold + fadeOut);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish, opacity, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={['#000000', '#020817', '#061428', '#000000']}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.root}
    >
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={LOGO}
          style={{ width: logoSize, height: logoSize }}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
