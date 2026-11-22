import { ChevronLeftIcon } from '@/components/icons';
import { useSideMenuStore } from '@/src/stores/useSideMenuStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
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
      <View style={[styles.header, { borderBottomColor: colors.borderSoft }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          onPress={goBack}
          style={styles.back}
        >
          <ChevronLeftIcon size={22} color={colors.icon} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Kino olami
        </Text>
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  webView: { flex: 1 },
});
