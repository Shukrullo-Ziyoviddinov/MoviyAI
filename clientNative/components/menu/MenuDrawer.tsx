import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Keyboard, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { drawerResponder } from '@/src/utils/side-menu-responder';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';

function interactionState() {
  const state = useSideMenuStore.getState();
  return { ...state, gesturesSuspended: state.gesturesSuspended || !!useMediaViewerStore.getState().item };
}

/** One persistent panel for both button transitions and finger tracking. */
export function MenuDrawer({ children, menu }: { children: ReactNode; menu: ReactNode }) {
  const open = useSideMenuStore(state => state.open);
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const panelWidth = width * 0.7;
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const position = useRef(open ? 1 : 0);
  const dragBase = useRef(0);
  const dragging = useRef(false);
  const settlingTarget = useRef<boolean | null>(null);
  const version = useRef(0);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    const listener = progress.addListener(({ value }) => { position.current = value; });
    return () => {
      ++version.current;
      progress.stopAnimation();
      progress.removeListener(listener);
    };
  }, [progress]);

  const animate = useCallback((opening: boolean) => {
    const currentVersion = ++version.current;
    progress.stopAnimation();
    if (opening) setVisible(true);
    Animated.timing(progress, {
      toValue: opening ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && currentVersion === version.current && !opening
          && !useSideMenuStore.getState().open && !dragging.current) setVisible(false);
    });
  }, [progress]);

  const close = useCallback(() => {
    if (useSideMenuStore.getState().open) useSideMenuStore.getState().closeMenu();
    else animate(false);
  }, [animate]);

  useEffect(() => {
    if (open) {
      Keyboard.dismiss();
      setVisible(true);
    }
    if (settlingTarget.current === open) {
      settlingTarget.current = null;
      return;
    }
    settlingTarget.current = null;
    if (!dragging.current) animate(open);
  }, [open, animate]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  const makeResponder = useCallback((mode: 'open' | 'close') => PanResponder.create(
    drawerResponder(mode, interactionState, {
      start: () => {
        ++version.current;
        progress.stopAnimation();
        dragBase.current = position.current;
        dragging.current = true;
        Keyboard.dismiss();
        setVisible(true);
      },
      move: dx => {
        const value = Math.max(0, Math.min(1, dragBase.current + dx / panelWidth));
        position.current = value;
        progress.setValue(value);
      },
      end: (_gesture, valid) => {
        dragging.current = false;
        const state = interactionState();
        // Match the web drawer: settle to open after revealing 40% of the panel.
        const opening = valid ? position.current >= 0.4 : state.open;
        settlingTarget.current = opening === state.open ? null : opening;
        if (opening) state.openFromGesture(state.gestureRevision);
        else state.closeMenu();
        animate(opening);
      },
    })
  ), [animate, panelWidth, progress]);
  const opener = useMemo(() => makeResponder('open'), [makeResponder]);
  const closer = useMemo(() => makeResponder('close'), [makeResponder]);

  return <View style={[styles.root, visible && styles.foreground]} {...opener.panHandlers}>
    <View style={styles.root} pointerEvents={visible ? 'none' : 'auto'}
      importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      accessibilityViewIsModal={visible}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button"
        accessibilityLabel={t('common.close')} testID="menu-backdrop">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
        }]} />
      </Pressable>
      <Animated.View style={[styles.panel, { width: panelWidth, transform: [{
        translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }),
      }] }]} {...closer.panHandlers}>{menu}</Animated.View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  foreground: { zIndex: 100 },
  backdrop: { backgroundColor: '#000' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
