import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Easing, Linking, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayIcon } from '@/components/icons';
import { useTheme } from '@/src/stores/useThemeStore';
import { watchOptions } from '@/src/utils/watch-options';

type WatchMovie = { watchUrl?: string | null; watchUrls?: string[] };

export function WatchOptionModal({ visible, onClose, movie, title, onSelect }: {
  visible: boolean; onClose: () => void; movie: WatchMovie; title?: string; onSelect: (url: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const options = watchOptions(movie);
  const bottom = Math.max(insets.bottom, 20);
  const sheetHeight = Math.min(height - insets.top - 24, 112 + Math.min(options.length, 5) * 78 + bottom);
  const [present, setPresent] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef<{ start: number | null; distance: number } | null>(null);
  const shown = useRef(false);
  const latestVisible = useRef(visible);
  latestVisible.current = visible;
  const version = useRef(0);
  const animate = useCallback((opening: boolean) => {
    drag.current = null;
    const token = ++version.current;
    progress.stopAnimation();
    Animated.timing(progress, { toValue: opening ? 1 : 0, duration: opening ? 320 : 240,
      easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished && token === version.current && !opening && !latestVisible.current) {
        shown.current = false;
        setPresent(false);
      }
    });
  }, [progress]);
  useEffect(() => {
    return () => { ++version.current; progress.stopAnimation(); };
  }, [progress]);
  useEffect(() => {
    if (visible) setPresent(true);
    if (shown.current) animate(visible);
  }, [visible, animate]);
  const pan = useMemo(() => PanResponder.create({
    // The native Modal host claims unhandled touch starts. Own the header touch
    // immediately so the host cannot swallow subsequent drag events.
    onStartShouldSetPanResponderCapture: () => latestVisible.current,
    onStartShouldSetPanResponder: () => latestVisible.current,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => latestVisible.current && gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
    onMoveShouldSetPanResponder: (_event, gesture) => latestVisible.current && gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      ++version.current;
      const activeDrag = { start: null as number | null, distance: 0 };
      drag.current = activeDrag;
      // Read the actual native position, not a listener value left by the last close.
      progress.stopAnimation(value => {
        if (drag.current !== activeDrag) return;
        activeDrag.start = value;
        const next = Math.max(0, Math.min(1, value - activeDrag.distance / sheetHeight));
        progress.setValue(next);
      });
    },
    onPanResponderMove: (_event, gesture) => {
      const activeDrag = drag.current;
      if (!activeDrag) return;
      activeDrag.distance = Math.max(0, gesture.dy);
      if (activeDrag.start === null) return;
      const value = Math.max(0, Math.min(1, activeDrag.start - activeDrag.distance / sheetHeight));
      progress.setValue(value);
    },
    onPanResponderRelease: (_event, gesture) => {
      const activeDrag = drag.current;
      drag.current = null;
      if (!activeDrag || !latestVisible.current) return;
      const distance = Math.max(0, gesture.dy);
      // A tap must never close the sheet, even while opening or after reopening.
      if (distance > sheetHeight * 0.2 || distance > 6 && gesture.vy > 0.8) onClose();
      else animate(true);
    },
    onPanResponderTerminate: () => { drag.current = null; animate(latestVisible.current); },
    onPanResponderTerminationRequest: () => false,
  }), [animate, onClose, progress, sheetHeight]);
  if (!present) return null;
  return <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent
    onShow={() => { shown.current = true; animate(latestVisible.current); }}>
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: progress.interpolate({inputRange:[0,1],outputRange:[0,0.55]}) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[styles.sheet, { height: sheetHeight, backgroundColor: colors.panel, borderColor: colors.borderSoft,
        paddingBottom: bottom, transform: [{translateY:progress.interpolate({inputRange:[0,1],outputRange:[sheetHeight,0]})}] }]}>
        <View collapsable={false} style={styles.heading} {...pan.panHandlers}>
          <View pointerEvents="none">
            <View style={[styles.handle, {backgroundColor:colors.border}]} />
            <Text style={[styles.title, { color: colors.text }]}>{t('movie.watchOptionsTitle')}</Text>
            {!!title && <Text numberOfLines={1} style={{ color: colors.textMuted, marginTop: 4 }}>{title}</Text>}
          </View>
        </View>
        <ScrollView style={{flex:1}} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {options.map(option => <Pressable key={option.url} onPress={() => onSelect(option.url)} accessibilityRole="link"
            style={({ pressed }) => [styles.option, { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft, opacity: pressed ? 0.7 : 1 }]}>
            <PlayIcon size={20} color={colors.accentBright} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{option.domain}</Text>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{new URL(option.url).pathname}</Text>
            </View>
            <Text style={{ color: colors.textMuted }}>{'\u2197'}</Text>
          </Pressable>)}
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}

export function WatchButton({ movie, title, children, style, onBeforeOpen }: {
  movie: WatchMovie; title?: string; children: ReactNode; style?: StyleProp<ViewStyle>; onBeforeOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const options = watchOptions(movie);
  const select = async (url: string) => {
    setOpen(false);
    try { await Linking.openURL(url); }
    catch { Alert.alert(t('common.error'), t('movie.watchOpenFailed')); }
  };
  return <>
    <Pressable style={[style, !options.length && { opacity: 0.6 }]} disabled={!options.length} accessibilityRole="button"
      onPress={() => { onBeforeOpen?.(); if (options.length === 1) void select(options[0].url); else setOpen(true); }}>{children}</Pressable>
    <WatchOptionModal visible={open} onClose={() => setOpen(false)} movie={movie} title={title} onSelect={url => { void select(url); }} />
  </>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  heading: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 14, borderWidth: 1, borderRadius: 16, marginBottom: 8 },
});
