import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/src/stores/useThemeStore';

export function AiWaiting() {
  const { colors } = useTheme();
  const [rotation] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    animation.start();
    return () => { animation.stop(); rotation.setValue(0); };
  }, [reduced, rotation]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel="Javob tayyorlanmoqda"
    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 }}>
    <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={12} fill="none" stroke={colors.accentBright} strokeWidth={1.5} />
        <Circle cx={14} cy={14} r={2} fill={colors.accentBright} />
        {[[14, 7], [21, 14], [14, 21], [7, 14]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={colors.accentBright} opacity={0.7} />)}
      </Svg>
    </Animated.View>
    <Text style={{ color: colors.textMuted, fontSize: 14 }}>Javob tayyorlanmoqda...</Text>
  </View>;
}
