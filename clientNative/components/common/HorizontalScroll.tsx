import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollView } from 'react-native';

type HorizontalScrollProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** Native axis locking keeps horizontal rows compatible with vertical page scrolling. */
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
