import { useTheme } from '@/src/stores/useThemeStore';
import { buildYoutubeEmbedHtml } from '@/src/utils/youtubeEmbed';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const OPEN_MS = 320;
const CLOSE_MS = 240;

type TrailerModalProps = {
  visible: boolean;
  onClose: () => void;
  trailerUrl?: string | null;
};

export function TrailerModal({
  visible,
  onClose,
  trailerUrl,
}: TrailerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 16);
  const videoH = Math.round((width - 32) * (9 / 16));
  const sheetH = Math.min(
    videoH + 140 + bottomPad,
    height - insets.top - 24
  );

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(sheetH);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const skipCloseAnim = useRef(false);

  const html = useMemo(
    () => buildYoutubeEmbedHtml(trailerUrl),
    [trailerUrl]
  );

  useEffect(() => {
    sheetHeightSV.value = sheetH;
  }, [sheetH, sheetHeightSV]);

  useEffect(() => {
    if (visible) {
      skipCloseAnim.current = false;
      setMounted(true);
      setLoading(true);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!mounted || skipCloseAnim.current) {
      skipCloseAnim.current = false;
      return;
    }

    const current = (1 - progress.value) * sheetHeightSV.value + dragY.value;
    progress.value = 1;
    dragY.value = current;
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          progress.value = 0;
          dragY.value = 0;
          runOnJS(setMounted)(false);
        }
      }
    );
  }, [visible, progress, dragY, mounted, sheetHeightSV]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const finishClose = () => {
    progress.value = 0;
    dragY.value = 0;
    skipCloseAnim.current = true;
    onClose();
    setMounted(false);
  };

  const snapClose = () => {
    'worklet';
    const remaining = Math.max(0, sheetHeightSV.value - dragY.value);
    const duration = Math.max(
      140,
      Math.min(CLOSE_MS, (remaining / sheetHeightSV.value) * CLOSE_MS)
    );
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const threshold = sheetHeightSV.value * 0.2;
      if (dragY.value > threshold || e.velocityY > 800) {
        snapClose();
      } else {
        dragY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      0.55 *
      Math.max(0, 1 - dragY.value / (sheetHeightSV.value + 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - progress.value) * sheetHeightSV.value + dragY.value,
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetH,
            paddingBottom: bottomPad,
            backgroundColor: colors.panel,
            borderColor: colors.borderSoft,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.dragZone}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
        </GestureDetector>

        <View style={[styles.videoWrap, { height: videoH }]}>
          {html ? (
            <>
              <WebView
                key={trailerUrl ?? 'trailer'}
                originWhitelist={['*']}
                source={{ html }}
                style={styles.webview}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                onLoadEnd={() => setLoading(false)}
              />
              {loading ? (
                <View style={styles.loader}>
                  <ActivityIndicator color={colors.accentBright} />
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t('movie.trailerUnavailable')}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t('movie.trailer')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 95,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  dragZone: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  videoWrap: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
