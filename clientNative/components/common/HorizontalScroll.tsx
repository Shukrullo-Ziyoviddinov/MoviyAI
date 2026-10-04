import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';

type HorizontalScrollProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Qo'l tashlanganda inertsiya (1 ga yaqin = uzoqroq) */
  deceleration?: number;
};

/**
 * Global horizontal scroll — qo'l tezligiga qarab withDecay bilan silliq inersiya.
 */
export function HorizontalScroll({
  children,
  style,
  contentContainerStyle,
  deceleration = 0.998,
}: HorizontalScrollProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const [viewportW, setViewportW] = useState(0);
  const [contentW, setContentW] = useState(0);

  useEffect(() => {
    const nextMax = Math.max(0, contentW - viewportW);
    maxScroll.value = nextMax;
    translateX.value = clamp(translateX.value, -nextMax, 0);
  }, [contentW, viewportW, maxScroll, translateX]);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width);
  }, []);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    setContentW(e.nativeEvent.layout.width);
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(
        startX.value + e.translationX,
        -maxScroll.value,
        0
      );
    })
    .onEnd((e) => {
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [-maxScroll.value, 0],
        deceleration,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.viewport, style]} onLayout={onViewportLayout}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.track, contentContainerStyle, animatedStyle]}
          onLayout={onContentLayout}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    width: '100%',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
