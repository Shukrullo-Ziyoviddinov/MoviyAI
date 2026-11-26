import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Keyboard, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { drawerResponder } from '@/src/utils/side-menu-responder';
import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';

export const KinoDrawerNavbarContext = createContext<{
  interactive: boolean;
} | null>(null);

function interactionState() {
  const state = useSideMenuStore.getState();
  return { ...state, gesturesSuspended: state.gesturesSuspended || !!useMediaViewerStore.getState().item };
}

/** One persistent panel for both button transitions and finger tracking. */
export function MenuDrawer({ children, menu, footer, webViewHandlesSwipe = false }: { children: ReactNode; menu: ReactNode; footer: ReactNode; webViewHandlesSwipe?: boolean }) {
  const open = useSideMenuStore(state => state.open);
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const panelWidth = width * 0.7;
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const position = useRef(open ? 1 : 0);
  const dragBase = useRef(0);
  const dragging = useRef(false);
  const animationTarget = useRef<boolean | null>(open);
  const animation = useRef({ version: 0 }).current;
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    const listener = progress.addListener(({ value }) => { position.current = value; });
    return () => {
      ++animation.version;
      progress.stopAnimation();
      progress.removeListener(listener);
    };
  }, [animation, progress]);

  const animate = useCallback((opening: boolean) => {
    if (animationTarget.current === opening) return;
    animationTarget.current = opening;
    const currentVersion = ++animation.version;
    progress.stopAnimation();
    if (opening) setVisible(true);
    Animated.timing(progress, {
      toValue: opening ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && currentVersion === animation.version && !opening
          && !useSideMenuStore.getState().open && !dragging.current) setVisible(false);
    });
  }, [animation, progress]);

  const close = useCallback(() => {
    if (useSideMenuStore.getState().open) useSideMenuStore.getState().closeMenu();
    else animate(false);
  }, [animate]);

  useEffect(() => {
    if (open) {
      if (!webViewHandlesSwipe) Keyboard.dismiss();
      setVisible(true);
    }
    if (!dragging.current) animate(open);
  }, [open, animate, webViewHandlesSwipe]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  const drag = useMemo(() => ({
    start: () => {
      animationTarget.current = null;
      ++animation.version;
      progress.stopAnimation();
      dragBase.current = position.current;
      dragging.current = true;
      if (!webViewHandlesSwipe) Keyboard.dismiss();
      setVisible(true);
    },
    move: (dx: number) => {
      const value = Math.max(0, Math.min(1, dragBase.current + dx / panelWidth));
      position.current = value;
      progress.setValue(value);
    },
    end: (valid: boolean, openAfterSwipe?: boolean) => {
      dragging.current = false;
      const state = interactionState();
      const opening = valid ? (openAfterSwipe ?? position.current >= 0.4) : state.open;
      if (opening === state.open) {
        animate(opening);
      } else if (opening) {
        state.openFromGesture(state.gestureRevision);
      } else {
        state.closeMenu();
      }
    },
  }), [animate, animation, panelWidth, progress, webViewHandlesSwipe]);

  useEffect(() => {
    if (!webViewHandlesSwipe) return;
    let revision: number | null = null;
    const unsubscribe = useSideMenuStore.subscribe((state, previous) => {
      const swipe = state.webMenuSwipe;
      if (!swipe || swipe === previous.webMenuSwipe) return;
      const current = interactionState();
      if (swipe.phase === 'move' && revision === null && !current.open && !current.gesturesSuspended) {
        revision = current.gestureRevision;
        drag.start();
      }
      if (revision === null) return;
      const valid = !current.gesturesSuspended && revision === current.gestureRevision;
      if (valid && swipe.phase !== 'cancel') drag.move(swipe.dx);
      if (swipe.phase !== 'move' || !valid) {
        revision = null;
        const releaseDistance = Math.min(42, panelWidth * 0.4);
        drag.end(valid && swipe.phase === 'end', swipe.dx >= releaseDistance);
      }
    });
    return () => {
      unsubscribe();
      if (revision !== null) drag.end(false);
    };
  }, [drag, panelWidth, webViewHandlesSwipe]);

  const makeResponder = useCallback((mode: 'open' | 'close') => PanResponder.create(
    drawerResponder(mode, interactionState, {
      start: drag.start,
      move: drag.move,
      end: (_gesture, valid) => drag.end(valid),
    })
  ), [drag]);
  const opener = useMemo(() => makeResponder('open'), [makeResponder]);
  const closer = useMemo(() => makeResponder('close'), [makeResponder]);
  const kinoNavbar = useMemo(() => webViewHandlesSwipe ? {
    interactive: !visible,
  } : null, [visible, webViewHandlesSwipe]);

  return <View style={[styles.root, visible && !webViewHandlesSwipe && styles.foreground]} {...(!webViewHandlesSwipe && opener.panHandlers)}>
    <View collapsable={false} style={styles.root} pointerEvents={visible && !webViewHandlesSwipe ? 'none' : 'auto'}
      importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <KinoDrawerNavbarContext.Provider value={kinoNavbar}>
      {footer}
    </KinoDrawerNavbarContext.Provider>
    <View style={[StyleSheet.absoluteFill, styles.foreground]} pointerEvents={visible && (!webViewHandlesSwipe || open) ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      accessibilityViewIsModal={visible}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button"
        accessibilityLabel={t('common.close')} testID="menu-backdrop">
        {!webViewHandlesSwipe && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, {
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
          }]} />
        )}
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
