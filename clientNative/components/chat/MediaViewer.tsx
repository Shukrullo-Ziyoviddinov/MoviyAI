import { useMediaViewerStore } from '@/src/stores/useMediaViewerStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Image as RNImage,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_ROW_HEIGHT } from './ChatHeader';

export function MediaViewer() {
  const { colors } = useTheme();
  const item = useMediaViewerStore((state) => state.item);
  const close = useMediaViewerStore((state) => state.close);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ w: screenW * 0.7, h: screenH * 0.4 });

  const maxW = screenW * 0.92;
  const maxH = screenH - insets.top - HEADER_ROW_HEIGHT - insets.bottom - 40;

  useEffect(() => {
    if (!item) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });

    return () => sub.remove();
  }, [item, close]);

  useEffect(() => {
    if (!item) return;

    RNImage.getSize(
      item.uri,
      (w, h) => {
        const ratio = w / h;
        let displayW = Math.min(w, maxW);
        let displayH = displayW / ratio;

        if (displayH > maxH) {
          displayH = maxH;
          displayW = displayH * ratio;
        }

        setSize({ w: displayW, h: displayH });
      },
      () => setSize({ w: maxW * 0.85, h: maxH * 0.55 })
    );
  }, [item, maxH, maxW]);

  if (!item) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bgDeep }]}
      pointerEvents="auto"
    >
      <View style={styles.center}>
        <Image
          source={{ uri: item.uri }}
          style={{ width: size.w, height: size.h, borderRadius: 12 }}
          contentFit="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 25,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
});
