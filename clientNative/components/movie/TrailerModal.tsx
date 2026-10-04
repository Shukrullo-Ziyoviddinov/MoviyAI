import { MovieDescriptionModal } from '@/components/movie/MovieDescriptionModal';
import { SimilarTrailerCard } from '@/components/movie/SimilarTrailerCard';
import { fetchSimilarTrailers } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { Movie, MovieDescriptionLocale } from '@/src/types/movie';
import { extractYoutubeVideoId } from '@/src/utils/youtubeEmbed';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import YoutubePlayer, { PLAYER_STATES } from 'react-native-youtube-iframe';

const OPEN_MS = 320;
const CLOSE_MS = 240;

type TrailerModalProps = {
  visible: boolean;
  onClose: () => void;
  movieId?: number | null;
  trailerUrl?: string | null;
  movieTitle?: string;
  description?: MovieDescriptionLocale | null;
  durationLabel?: string;
};

function durationLabelFor(
  description: MovieDescriptionLocale | null | undefined,
  language: string
) {
  if (!description?.duration) return '';
  if (language === 'ru') return `${description.duration} мин`;
  if (language === 'en') return `${description.duration} min`;
  return `${description.duration} daq`;
}

export function TrailerModal({
  visible,
  onClose,
  movieId,
  trailerUrl,
  movieTitle,
  description = null,
  durationLabel = '',
}: TrailerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const lang = language === 'en' ? 'uz' : language;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 16);
  const videoH = Math.round((width - 32) * (9 / 16));
  const sheetH = Math.min(
    Math.max(height * 0.92, videoH + 320 + bottomPad),
    height - insets.top - 4
  );

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(sheetH);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(movieId ?? null);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState(trailerUrl ?? '');
  const [activeTitle, setActiveTitle] = useState(movieTitle ?? '');
  const [activeDescription, setActiveDescription] =
    useState<MovieDescriptionLocale | null>(description);
  const [activeDurationLabel, setActiveDurationLabel] = useState(durationLabel);
  const skipCloseAnim = useRef(false);

  const videoId = useMemo(
    () => extractYoutubeVideoId(activeTrailerUrl),
    [activeTrailerUrl]
  );

  useEffect(() => {
    sheetHeightSV.value = sheetH;
  }, [sheetH, sheetHeightSV]);

  useEffect(() => {
    if (!visible) return;
    setActiveId(movieId ?? null);
    setActiveTrailerUrl(trailerUrl ?? '');
    setActiveTitle(movieTitle ?? '');
    setActiveDescription(description);
    setActiveDurationLabel(durationLabel);
  }, [visible, movieId, trailerUrl, movieTitle, description, durationLabel]);

  useEffect(() => {
    if (!visible || !activeId) {
      setSimilar([]);
      return;
    }

    let alive = true;
    setSimilarLoading(true);
    fetchSimilarTrailers(activeId)
      .then((rows) => {
        if (!alive) return;
        setSimilar(rows);
      })
      .catch(() => {
        if (!alive) return;
        setSimilar([]);
      })
      .finally(() => {
        if (alive) setSimilarLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [visible, activeId]);

  useEffect(() => {
    if (visible) {
      skipCloseAnim.current = false;
      setMounted(true);
      setReady(false);
      setPlaying(false);
      setDescOpen(false);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    setPlaying(false);
    setDescOpen(false);

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
      if (descOpen) {
        setDescOpen(false);
        return true;
      }
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, descOpen]);

  const finishClose = () => {
    progress.value = 0;
    dragY.value = 0;
    skipCloseAnim.current = true;
    setPlaying(false);
    setDescOpen(false);
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
    .enabled(!descOpen)
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
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

  const onStateChange = useCallback((state: PLAYER_STATES) => {
    if (state === PLAYER_STATES.ENDED) setPlaying(false);
  }, []);

  const openDescription = () => {
    setPlaying(false);
    setDescOpen(true);
  };

  const selectSimilar = (movie: Movie) => {
    const nextDesc = movie.description?.[lang] ?? movie.description?.uz ?? null;
    setActiveId(movie.id);
    setActiveTrailerUrl(movie.trailers ?? '');
    setActiveTitle(movie.title[lang] ?? movie.title.uz);
    setActiveDescription(nextDesc);
    setActiveDurationLabel(durationLabelFor(nextDesc, language));
    setReady(false);
    setPlaying(false);
    setDescOpen(false);
  };

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

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (descOpen) return;
            onClose();
          }}
        />
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
          </View>
        </GestureDetector>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.videoWrap, { height: videoH }]}>
            {videoId ? (
              <>
                <YoutubePlayer
                  key={videoId}
                  height={videoH}
                  width={width - 32}
                  play={playing && !descOpen}
                  videoId={videoId}
                  webViewProps={{
                    allowsInlineMediaPlayback: true,
                    mediaPlaybackRequiresUserAction: false,
                    androidLayerType: 'hardware',
                  }}
                  initialPlayerParams={{
                    controls: true,
                    modestbranding: true,
                    rel: false,
                    preventFullScreen: false,
                  }}
                  onReady={() => {
                    setReady(true);
                    setPlaying(true);
                  }}
                  onChangeState={onStateChange}
                />
                {!ready ? (
                  <View style={styles.loader} pointerEvents="none">
                    <ActivityIndicator color={colors.accentBright} />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('movie.trailerUnavailable')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.meta}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
            >
              {activeTitle?.trim() || t('movie.trailer')}
            </Text>

            {activeDescription?.text ? (
              <View style={styles.descBlock}>
                <Text
                  style={[styles.descText, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {activeDescription.text}
                </Text>
                <Pressable onPress={openDescription} hitSlop={6}>
                  <Text style={[styles.moreInfo, { color: colors.accentBright }]}>
                    {t('movie.moreInfo')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {similarLoading || similar.length > 0 ? (
            <View style={styles.similarSection}>
              <Text style={[styles.similarTitle, { color: colors.text }]}>
                {t('movie.similarTrailers')}
              </Text>
              {similarLoading ? (
                <ActivityIndicator color={colors.accentBright} />
              ) : (
                <View style={styles.similarList}>
                  {similar.map((item) => (
                    <SimilarTrailerCard
                      key={item.id}
                      movie={item}
                      language={lang}
                      onPress={selectSimilar}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      <MovieDescriptionModal
        visible={descOpen}
        onClose={() => setDescOpen(false)}
        description={activeDescription}
        durationLabel={activeDurationLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 95,
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 14,
  },
  meta: {
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  descBlock: {
    gap: 4,
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  moreInfo: {
    fontSize: 13,
    fontWeight: '700',
  },
  similarSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  similarTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  similarList: {
    gap: 8,
  },
  videoWrap: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
