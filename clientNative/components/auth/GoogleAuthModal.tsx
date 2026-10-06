import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();

const OPEN_MS = 320;
const CLOSE_MS = 240;

const extra = (Constants.expoConfig?.extra ?? {}) as {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
  googleIosClientId?: string;
};

export function GoogleAuthModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const modalOpen = useAuthStore((s) => s.modalOpen);
  const busy = useAuthStore((s) => s.busy);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const loginWithIdToken = useAuthStore((s) => s.loginWithIdToken);

  const bottomPad = Math.max(insets.bottom, 16);
  const sheetH = Math.min(height * 0.52, 420) + bottomPad;
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(sheetH);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipCloseAnim = useRef(false);

  const webClientId = extra.googleWebClientId?.trim() || undefined;
  const androidClientId = extra.googleAndroidClientId?.trim() || undefined;
  const iosClientId = extra.googleIosClientId?.trim() || undefined;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    androidClientId,
    iosClientId,
    webClientId,
  });

  useEffect(() => {
    sheetHeightSV.value = sheetH;
  }, [sheetH, sheetHeightSV]);

  useEffect(() => {
    if (modalOpen) {
      skipCloseAnim.current = false;
      setMounted(true);
      setError(null);
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
  }, [modalOpen, progress, dragY, mounted, sheetHeightSV]);

  useEffect(() => {
    if (!modalOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeAuthModal();
      return true;
    });
    return () => sub.remove();
  }, [modalOpen, closeAuthModal]);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken =
        response.params.id_token ||
        (response as { authentication?: { idToken?: string } }).authentication
          ?.idToken;
      if (!idToken) {
        setError(t('auth.errors.noToken'));
        return;
      }
      loginWithIdToken(idToken).catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : t('auth.errors.loginFailed')
        );
      });
      return;
    }
    if (response.type === 'error') {
      setError(t('auth.errors.cancelled'));
    }
  }, [response, loginWithIdToken, t]);

  const finishClose = () => {
    progress.value = 0;
    dragY.value = 0;
    skipCloseAnim.current = true;
    closeAuthModal();
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

  const onGooglePress = async () => {
    setError(null);
    if (!webClientId && !androidClientId && !iosClientId) {
      setError(t('auth.errors.missingClientId'));
      return;
    }
    try {
      await promptAsync();
    } catch {
      setError(t('auth.errors.cancelled'));
    }
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAuthModal} />
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

        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.googleMark}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('auth.title')}
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('auth.subtitle')}
          </Text>

          <Pressable
            style={[
              styles.googleBtn,
              {
                backgroundColor: colors.bg,
                borderColor: colors.borderSoft,
                opacity: busy || !request ? 0.7 : 1,
              },
            ]}
            onPress={onGooglePress}
            disabled={busy || !request}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentBright} />
            ) : (
              <>
                <View style={styles.googleBtnIcon}>
                  <Text style={styles.googleBtnG}>G</Text>
                </View>
                <Text style={[styles.googleBtnText, { color: colors.text }]}>
                  {t('auth.continueGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          {error ? (
            <Text style={[styles.error, { color: '#EF4444' }]}>{error}</Text>
          ) : null}

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('auth.hint')}
          </Text>

          <Pressable onPress={closeAuthModal} hitSlop={8} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.accentBright }]}>
              {t('auth.later')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 140,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  dragZone: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  googleG: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4285F4',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  googleBtn: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  googleBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnG: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EA4335',
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  laterBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
