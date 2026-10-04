import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

type HorizontalScrollProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Global horizontal scroll — qo'l tezligiga qarab native inersiya bilan silliq.
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
