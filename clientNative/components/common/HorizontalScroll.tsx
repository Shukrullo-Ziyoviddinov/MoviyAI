import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

type HorizontalScrollProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Horizontal row for movie cards.
 * gesture-handler ScrollView — Pressable (GH) bilan birga scroll ishlaydi.
 */
export function HorizontalScroll({
  children,
  style,
  contentContainerStyle,
}: HorizontalScrollProps) {
  return (
    <ScrollView
      horizontal
      style={style}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      bounces
      alwaysBounceHorizontal
      decelerationRate={0.985}
      scrollEventThrottle={16}
      nestedScrollEnabled
      directionalLockEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
