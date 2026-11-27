import { apiBaseUrl } from '@/src/api/client';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useKinoModalStore } from '@/src/stores/useKinoModalStore';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [frameReady, setFrameReady] = useState(false);
  const [frameDocument, setFrameDocument] = useState<number | null>(null);
  const [sessionRevision, setSessionRevision] = useState(0);
  const sessionError = useRef(false);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const focused = useIsFocused();
  const requestedPage = useKinoModalStore((state) => state.requestedPage);

  const send = useCallback((message: object) => {
    const allowed = [new URL(embedUrl).origin, new URL(publicEmbedUrl).origin];
    webView.current?.injectJavaScript(`
      if (${JSON.stringify(allowed)}.includes(window.location.origin) &&
          /^\\/embed(?:\\/|$)/.test(window.location.pathname)) {
        window.dispatchEvent(new CustomEvent('kino-olami:host', { detail: ${JSON.stringify(message)} }));
      }
      true;
    `);
  }, [embedUrl]);

  useEffect(() => {
    if (frameReady && frameDocument !== null) send({ type: 'moviyai:kino-session', token: null });
  }, [focused, frameDocument, frameReady, hydrated, send, token]);

  useEffect(() => {
    if (!frameReady || frameDocument === null || !focused || !hydrated || !token) return;
    const controller = new AbortController();
    let request = 0;
    async function refresh() {
      const revision = ++request;
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/kino-session`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || typeof result.data?.token !== 'string') throw new Error('Session unavailable');
        if (!controller.signal.aborted && revision === request) {
          sessionError.current = false;
          send({ type: 'moviyai:kino-session', token: result.data.token });
        }
      } catch {
        if (!controller.signal.aborted && revision === request) sessionError.current = true;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 10 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [focused, frameDocument, frameReady, hydrated, send, sessionRevision, token]);

  useEffect(() => {
    if (!focused || !frameReady || frameDocument === null || !requestedPage) return;
    send({ type: 'moviyai:kino-page', page: requestedPage.page });
    useKinoModalStore.getState().clearPageRequest();
  }, [focused, frameDocument, frameReady, requestedPage, send]);

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
      useSideMenuStore.getState().setWebMenuSwipe({ phase: 'cancel', dx: 0 });
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
      if (message?.type === 'kino-olami:ready') setFrameReady(true);
      if (message?.type === 'kino-olami:native-document' &&
          typeof message.id === 'number' && Number.isFinite(message.id)) {
        setFrameDocument(message.id);
      }
      if (message?.type === 'kino-olami:page' && typeof message.wishlist === 'boolean') {
        useKinoModalStore.getState().setWishlist(message.wishlist);
      }
      if (message?.type === 'kino-olami:linked' || message?.type === 'kino-olami:refresh-session') setSessionRevision((value) => value + 1);
      if (message?.type === 'kino-olami:login-required') {
        if (hydrated && !token) useAuthStore.getState().openAuthModal('wishlist');
        if (token && sessionError.current) setSessionRevision((value) => value + 1);
      }
      if (message?.type === 'kino-olami:menu-swipe' &&
          (message.phase === 'move' || message.phase === 'end' || message.phase === 'cancel') &&
          typeof message.dx === 'number' && Number.isFinite(message.dx)) {
        useSideMenuStore.getState().setWebMenuSwipe({ phase: message.phase, dx: message.dx });
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
            setFrameReady(false);
            setFrameDocument(null);
            setEmbedUrl(publicEmbedUrl);
          }
        }}
        onMessage={handleWebViewMessage}
        onLoadStart={() => {
          setKinoModalOpen(false);
        }}
        onLoadEnd={() => {
          // Both platforms can emit load callbacks for in-page history.
          webView.current?.injectJavaScript(`
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'kino-olami:native-document',
              id: performance.timeOrigin,
            }));
            true;
          `);
          send({ type: 'moviyai:hello' });
        }}
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
