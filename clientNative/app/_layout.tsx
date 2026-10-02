import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={showSplash ? 'light' : 'auto'} />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'MoviyAI' }} />
      </Stack>
      {showSplash ? <AppSplashScreen onFinish={handleSplashFinish} /> : null}
    </GestureHandlerRootView>
  );
}
