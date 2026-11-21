import { useEffect, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { DeferredViewport } from '@/src/utils/deferred-viewport';

/** Mount expensive descendants once, just before their section enters the viewport. */
export function DeferredSection({ viewport, minHeight, style, children }: {
  viewport: DeferredViewport; minHeight: number; style?: StyleProp<ViewStyle>; children: () => ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    if (visible || top === null) return;
    return viewport.watch(top, () => setVisible(true));
  }, [viewport, top, visible]);
  return <View style={[style, !visible && { minHeight }]} onLayout={event => {
    if (visible) return;
    setTop(event.nativeEvent.layout.y);
  }}>{visible ? children() : null}</View>;
}
