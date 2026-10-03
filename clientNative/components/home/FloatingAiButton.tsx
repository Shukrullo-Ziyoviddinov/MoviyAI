import { BOTTOM_NAV_BAR, BOTTOM_NAV_LIFT } from '@/components/nav/BottomNav';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AI_ROBOT = require('../../assets/images/ai_preview_rev_1.png');
const SIZE = 68;
const FLING_VX = 420;

type FloatingAiButtonProps = {
  onPress?: () => void;
};

function goChatDefault() {
  router.push('/');
}

export function FloatingAiButton({ onPress }: FloatingAiButtonProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const minX = 8;
  const minY = insets.top + 8;
  const maxX = width - SIZE - 8;
  const maxY =
    height - SIZE - Math.max(insets.bottom, 0) - BOTTOM_NAV_LIFT - BOTTOM_NAV_BAR;

  const x = useSharedValue(maxX);
  const y = useSharedValue(Math.max(minY, maxY));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const maxXSV = useSharedValue(maxX);
  const maxYSV = useSharedValue(maxY);
  const minXSV = useSharedValue(minX);
  const minYSV = useSharedValue(minY);
  const widthSV = useSharedValue(width);

  useEffect(() => {
    maxXSV.value = maxX;
    maxYSV.value = maxY;
    minXSV.value = minX;
    minYSV.value = minY;
    widthSV.value = width;
    x.value = Math.min(Math.max(x.value, minX), maxX);
    y.value = Math.min(Math.max(y.value, minY), maxY);
  }, [maxX, maxY, minX, minY, width, maxXSV, maxYSV, minXSV, minYSV, widthSV, x, y]);

  const handlePress = () => {
    if (onPress) onPress();
    else goChatDefault();
  };

  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      const nextX = startX.value + e.translationX;
      const nextY = startY.value + e.translationY;
      x.value = Math.min(Math.max(nextX, minXSV.value), maxXSV.value);
      y.value = Math.min(Math.max(nextY, minYSV.value), maxYSV.value);
    })
    .onEnd((e) => {
      const currentX = Math.min(
        Math.max(startX.value + e.translationX, minXSV.value),
        maxXSV.value
      );
      const currentY = Math.min(
        Math.max(startY.value + e.translationY, minYSV.value),
        maxYSV.value
      );
      x.value = currentX;
      y.value = currentY;

      // Tezlik kuchli bo'lsa — tomonni velocity belgilaydi; aks holda 50%
      let snapLeft: boolean;
      if (Math.abs(e.velocityX) > FLING_VX) {
        snapLeft = e.velocityX < 0;
      } else {
        snapLeft = currentX + SIZE / 2 < widthSV.value * 0.5;
      }
      const targetX = snapLeft ? minXSV.value : maxXSV.value;

      // X: tezlik bilan chetga silliq
      x.value = withSpring(targetX, {
        damping: 16,
        stiffness: 130,
        mass: 0.8,
        velocity: e.velocityX,
      });

      // Y: inersiya — qotib qolmaydi, tezlikka qarab davom etadi
      y.value = withDecay({
        velocity: e.velocityY,
        clamp: [minYSV.value, maxYSV.value],
        deceleration: 0.997,
      });
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(handlePress)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, style]}>
        <Image source={AI_ROBOT} style={styles.img} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 40,
  },
  img: {
    width: SIZE,
    height: SIZE,
  },
});
