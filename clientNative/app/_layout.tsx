import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
import { LanguageModal } from '@/components/language/LanguageModal';
import { SideMenu } from '@/components/menu/SideMenu';
import { BottomNav } from '@/components/nav/BottomNav';
import '@/src/i18n';
import { useTheme } from '@/src/stores/useThemeStore';
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

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
        <SideMenu>
          <Stack
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.bg },
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              transitionSpec: {
                open: slideSpec,
                close: slideSpec,
              },
            }}
          >
            <Stack.Screen name="index" options={{ animationEnabled: false }} />
            <Stack.Screen name="home" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
          </Stack>
        </SideMenu>
        <BottomNav />
        <LanguageModal />
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
