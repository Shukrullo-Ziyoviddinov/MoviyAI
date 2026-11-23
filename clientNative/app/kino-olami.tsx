import { ChevronLeftIcon } from '@/components/icons';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const publicEmbedUrl = 'https://www.kino-olami.uz/embed';
const initialEmbedUrl = process.env.EXPO_PUBLIC_KINO_OLAMI_EMBED_URL?.trim() || publicEmbedUrl;

export default function KinoOlamiScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webView = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl);

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
        key={embedUrl}
        source={{ uri: embedUrl }}
        onError={() => {
          if (embedUrl !== publicEmbedUrl) {
            canGoBack.current = false;
            setEmbedUrl(publicEmbedUrl);
          }
        }}
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
