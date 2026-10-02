import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';
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
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#030308' } }}>
            <Stack.Screen name="index" />
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
