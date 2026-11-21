import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, cancelAnimation, Easing, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

/** Every focused skeleton shares one clock; the last release stops it. */
export function createPulseSubscriptions(start: () => void, stop: () => void) {
  const leases = new Set<object>();
  return {
    subscribe() {
      const lease = {};
      if (leases.size === 0) start();
      leases.add(lease);
      return () => {
        if (leases.delete(lease) && leases.size === 0) stop();
      };
    },
    dispose() { leases.clear(); stop(); },
  };
}

export const SkeletonGroupContext = createContext(false);

type Pulse = { opacity: SharedValue<number>; subscribe: () => () => void };
export const SkeletonPulseContext = createContext<Pulse | null>(null);

export function SkeletonPulseProvider({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(0.45);
  const subscriptions = useMemo(() => createPulseSubscriptions(
    () => { opacity.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true); },
    () => cancelAnimation(opacity),
  ), [opacity]);
  useEffect(() => () => subscriptions.dispose(), [subscriptions]);
  const value = useMemo(() => ({ opacity, subscribe: subscriptions.subscribe }), [opacity, subscriptions]);
  return <SkeletonPulseContext.Provider value={value}>{children}</SkeletonPulseContext.Provider>;
}

export function useSkeletonAnimation() {
  const shared = useContext(SkeletonPulseContext);
  useFocusEffect(useCallback(() => shared?.subscribe(), [shared]));
  const opacity = shared?.opacity;
  return useAnimatedStyle(() => ({ opacity: opacity ? opacity.value : 0.65 }));
}

/** Animate the whole loading layout once, leaving its individual bones static. */
export function SkeletonGroup({ children, style }: { children: ReactNode; style?: import('react-native').StyleProp<import('react-native').ViewStyle> }) {
  const pulse = useSkeletonAnimation();
  return <SkeletonGroupContext.Provider value={true}>
    <Animated.View pointerEvents="box-none" style={[style, pulse]}>{children}</Animated.View>
  </SkeletonGroupContext.Provider>;
}
