import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';

/** Matches the trailer sheet timing; only the handle owns drag gestures. */
export function useSearchSheetMotion(mobile: boolean, height: number, onClosed: () => void, onClosing: () => void) {
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false), version = useRef(0);
  const callbacks = useRef({ onClosed, onClosing });
  callbacks.current = { onClosed, onClosing };
  const drag = useRef<{ start: number | null; distance: number } | null>(null);
  const animate = useCallback((opening: boolean) => {
    drag.current = null;
    const token = ++version.current;
    progress.stopAnimation();
    Animated.timing(progress, { toValue: opening ? 1 : 0, duration: opening ? 320 : 240,
      easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished && token === version.current && !opening) callbacks.current.onClosed();
    });
  }, [progress]);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    callbacks.current.onClosing();
    animate(false);
  }, [animate]);
  useEffect(() => () => { ++version.current; drag.current = null; progress.stopAnimation(); }, [progress]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => mobile && !closing.current,
    onStartShouldSetPanResponder: () => mobile && !closing.current,
    onMoveShouldSetPanResponder: (_event, gesture) => mobile && !closing.current && gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      ++version.current;
      const current = { start: null as number | null, distance: 0 }; drag.current = current;
      progress.stopAnimation(value => {
        if (drag.current !== current) return;
        current.start = value;
        progress.setValue(Math.max(0, value - current.distance / height));
      });
    },
    onPanResponderMove: (_event, gesture) => {
      const current = drag.current; if (!current) return;
      current.distance = Math.max(0, gesture.dy);
      if (current.start !== null) progress.setValue(Math.max(0, current.start - current.distance / height));
    },
    onPanResponderRelease: (_event, gesture) => {
      const current = drag.current; drag.current = null;
      if (!current || closing.current) return;
      if (gesture.dy > height * 0.16 || gesture.dy > 8 && gesture.vy > 0.8) close();
      else animate(true);
    },
    onPanResponderTerminate: () => { drag.current = null; if (!closing.current) animate(true); },
    onPanResponderTerminationRequest: () => false,
  }), [mobile, height, progress, animate, close]);
  return { progress, close, panHandlers: pan.panHandlers, onShow: () => { if (!closing.current) animate(true); } };
}
