import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
import { GoogleAuthModal } from '@/components/auth/GoogleAuthModal';
import { LanguageModal } from '@/components/language/LanguageModal';
import { SideMenu } from '@/components/menu/SideMenu';
import { BottomNav } from '@/components/nav/BottomNav';
import '@/src/i18n';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const loadWishlistIds = useWishlistStore((s) => s.loadIds);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      openAuthModal('splash');
      return;
    }
    void loadWishlistIds(true);
  }, [hydrated, profile, openAuthModal, loadWishlistIds]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
        <SideMenu>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              gestureEnabled: false,
              // Keep the existing horizontal direction, using platform transitions.
              animation: 'slide_from_right',
              animationTypeForReplace: 'push',
              freezeOnBlur: true,
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="home" />
            <Stack.Screen name="favorites" />
            <Stack.Screen name="search" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="movie/[id]" />
            <Stack.Screen name="actor/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="data-manage" />
          </Stack>
        </SideMenu>
        <BottomNav />
        <LanguageModal />
        <GoogleAuthModal />
      </GestureHandlerRootView>
    </>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider>
      {showSplash ? (
        <>
          <StatusBar style="light" hidden />
          <AppSplashScreen onFinish={handleSplashFinish} />
        </>
      ) : (
        <AppNavigator />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
