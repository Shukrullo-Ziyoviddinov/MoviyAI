import { useKinoModalStore } from '@/src/stores/useKinoModalStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const publicEmbedUrl = 'https://www.kino-olami.uz/embed';
const initialEmbedUrl = process.env.EXPO_PUBLIC_KINO_OLAMI_EMBED_URL?.trim() || publicEmbedUrl;

export default function KinoOlamiScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const setKinoModalOpen = useKinoModalStore((s) => s.setOpen);
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
    return () => {
      subscription.remove();
      setKinoModalOpen(false);
    };
  }, [goBackInWebView, setKinoModalOpen]));

  function handleWebViewMessage({ nativeEvent }: WebViewMessageEvent) {
    try {
      // Android can report the sender origin without a path.
      const senderOrigin = new URL(nativeEvent.url).origin;
      const isTrustedOrigin = [embedUrl, publicEmbedUrl].some(
        (url) => new URL(url).origin === senderOrigin
      );
      if (!isTrustedOrigin) return;
      const message = JSON.parse(nativeEvent.data);
      if (message?.type === 'kino-olami:open-menu' && !useKinoModalStore.getState().open) {
        useSideMenuStore.getState().openMenu();
        return;
      }
      if (message?.type === 'kino-olami:share-modal' && typeof message.open === 'boolean') {
        setKinoModalOpen(message.open);
      }
    } catch {
      // Other WebView messages do not control the navbar.
    }
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
        onMessage={handleWebViewMessage}
        onLoadStart={() => setKinoModalOpen(false)}
        style={[styles.webView, { backgroundColor: colors.bg }]}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        onNavigationStateChange={(navigation) => {
          canGoBack.current = navigation.canGoBack;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webView: { flex: 1 },
});
