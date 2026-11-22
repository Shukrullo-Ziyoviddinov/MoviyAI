import { ChevronLeftIcon } from '@/components/icons';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const embedUrl = process.env.EXPO_PUBLIC_KINO_OLAMI_EMBED_URL?.trim() ||
  'https://kino-olami.uz/embed';

export default function KinoOlamiScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webView = useRef<WebView>(null);
  const canGoBack = useRef(false);

  const goBackInWebView = useCallback(() => {
    if (useSideMenuStore.getState().open || !webView.current || !canGoBack.current) {
      return false;
    }
    webView.current.goBack();
    return true;
  }, []);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBackInWebView);
    return () => subscription.remove();
  }, [goBackInWebView]));

  function goBack() {
    if (goBackInWebView()) return;
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={[styles.root, {
      backgroundColor: colors.bg,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]}>
      <WebView
        ref={webView}
        source={{ uri: embedUrl }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        onNavigationStateChange={(navigation) => {
          canGoBack.current = navigation.canGoBack;
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Orqaga"
        onPress={goBack}
        style={[styles.back, {
          left: insets.left + 12,
          bottom: insets.bottom + 12,
          backgroundColor: colors.panel,
          borderColor: colors.borderSoft,
        }]}
      >
        <ChevronLeftIcon size={22} color={colors.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: { flex: 1 },
});
