import type { MovieDescriptionLocale } from '@/src/types/movie';
import { useTheme } from '@/src/stores/useThemeStore';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPEN_MS = 320;
const CLOSE_MS = 240;

type MovieDescriptionModalProps = {
  visible: boolean;
  onClose: () => void;
  description: MovieDescriptionLocale | null;
  durationLabel: string;
};

export function MovieDescriptionModal({
  visible,
  onClose,
  description,
  durationLabel,
}: MovieDescriptionModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 16);
  const sheetH = Math.min(height * 0.82, height - insets.top - 24);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(sheetH);
  const [mounted, setMounted] = useState(false);
  const skipCloseAnim = useRef(false);

  useEffect(() => {
    sheetHeightSV.value = sheetH;
  }, [sheetH, sheetHeightSV]);

  useEffect(() => {
    if (visible) {
      skipCloseAnim.current = false;
      setMounted(true);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!mounted || skipCloseAnim.current) {
      skipCloseAnim.current = false;
      return;
    }

    const current = (1 - progress.value) * sheetHeightSV.value + dragY.value;
    progress.value = 1;
    dragY.value = current;
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          progress.value = 0;
          dragY.value = 0;
          runOnJS(setMounted)(false);
        }
      }
    );
  }, [visible, progress, dragY, mounted, sheetHeightSV]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const finishClose = () => {
    progress.value = 0;
    dragY.value = 0;
    skipCloseAnim.current = true;
    onClose();
    setMounted(false);
  };

  const snapClose = () => {
    'worklet';
    const remaining = Math.max(0, sheetHeightSV.value - dragY.value);
    const duration = Math.max(
      140,
      Math.min(CLOSE_MS, (remaining / sheetHeightSV.value) * CLOSE_MS)
    );
    dragY.value = withTiming(
      sheetHeightSV.value,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const threshold = sheetHeightSV.value * 0.2;
      if (dragY.value > threshold || e.velocityY > 800) {
        snapClose();
      } else {
        dragY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      0.55 *
      Math.max(0, 1 - dragY.value / (sheetHeightSV.value + 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - progress.value) * sheetHeightSV.value + dragY.value,
      },
    ],
  }));

  if (!mounted || !description) return null;

  const metaRows = [
    { key: 'year', label: t('movie.year'), value: String(description.year) },
    { key: 'country', label: t('movie.country'), value: description.country },
    { key: 'duration', label: t('movie.duration'), value: durationLabel },
    { key: 'director', label: t('movie.director'), value: description.director },
  ].filter((row) => Boolean(row.value));

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetH,
            paddingBottom: bottomPad,
            backgroundColor: colors.panel,
            borderColor: colors.borderSoft,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.dragZone}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>
              {t('movie.aboutTitle')}
            </Text>
          </View>
        </GestureDetector>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          bounces
        >
          <Text style={[styles.body, { color: colors.text }]}>
            {description.text}
          </Text>

          <View
            style={[
              styles.metaBlock,
              {
                backgroundColor: colors.panelSoft,
                borderColor: colors.borderSoft,
              },
            ]}
          >
            {metaRows.map((row, index) => (
              <View
                key={row.key}
                style={[
                  styles.metaRow,
                  index < metaRows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSoft,
                  },
                ]}
              >
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                  {row.label}
                </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 90,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  dragZone: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  metaBlock: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
  },
});
