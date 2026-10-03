import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
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
    duration: 300,
    easing: Easing.out(Easing.poly(4)),
  },
};

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
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" hidden={showSplash} />
        {showSplash ? (
          <AppSplashScreen onFinish={handleSplashFinish} />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#030308' },
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              transitionSpec: {
                open: slideSpec,
                close: slideSpec,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                animationEnabled: false,
              }}
            />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
          </Stack>
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030308',
  },
});
