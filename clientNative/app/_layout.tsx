import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
import { GoogleAuthModal } from '@/components/auth/GoogleAuthModal';
import { LanguageModal } from '@/components/language/LanguageModal';
import { SideMenu } from '@/components/menu/SideMenu';
import { BottomNav } from '@/components/nav/BottomNav';
import '@/src/i18n';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import {
  CardStyleInterpolators,
  Stack,
} from 'expo-router/js-stack';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Easing, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

const slideSpec = {
  animation: 'timing' as const,
  config: {
    duration: 380,
    easing: Easing.out(Easing.poly(4)),
  },
};

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
              cardStyle: { backgroundColor: colors.bg },
              gestureEnabled: false,
              gestureDirection: 'horizontal',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              transitionSpec: {
                open: slideSpec,
                close: slideSpec,
              },
            }}
          >
            <Stack.Screen name="index" options={{ animationEnabled: false }} />
            <Stack.Screen
              name="home"
              options={{
                transitionSpec: {
                  open: { animation: 'timing', config: { duration: 140 } },
                  close: { animation: 'timing', config: { duration: 140 } },
                },
              }}
            />
            <Stack.Screen
              name="favorites"
              options={{
                transitionSpec: {
                  open: { animation: 'timing', config: { duration: 140 } },
                  close: { animation: 'timing', config: { duration: 140 } },
                },
              }}
            />
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
