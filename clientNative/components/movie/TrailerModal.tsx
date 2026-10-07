import { BookmarkIcon, PlayIcon } from '@/components/icons';
import { MovieDescriptionModal } from '@/components/movie/MovieDescriptionModal';
import { SimilarTrailerCard } from '@/components/movie/SimilarTrailerCard';
import { fetchSimilarTrailers } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie, MovieDescriptionLocale } from '@/src/types/movie';
import { extractYoutubeVideoId } from '@/src/utils/youtubeEmbed';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
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
const SNAP_MS = 280;
/** Birinchi ochilish — yuqoridan ~20% ochiq. */
const OPEN_RATIO = 0.8;
const SAVE_ACTIVE = '#1E4FD6';

type TrailerModalProps = {
  visible: boolean;
  onClose: () => void;
  movieId?: number | null;
  trailerUrl?: string | null;
  watchUrl?: string | null;
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
  watchUrl,
  movieTitle,
  description = null,
  durationLabel = '',
}: TrailerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const lang = language === 'en' ? 'uz' : language;
  const toggleSave = useWishlistStore((s) => s.toggle);
  const savedIds = useWishlistStore((s) => s.movieIds);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 16);
  const videoH = Math.round((width - 32) * (9 / 16));
  const openH = Math.round(height * OPEN_RATIO);
  const fullH = height;

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const sheetH = useSharedValue(openH);
  const collapsedHSV = useSharedValue(openH);
  const fullHSV = useSharedValue(fullH);
  const expanded = useSharedValue(0);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(movieId ?? null);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState(trailerUrl ?? '');
  const [activeWatchUrl, setActiveWatchUrl] = useState(watchUrl ?? '');
  const [activeTitle, setActiveTitle] = useState(movieTitle ?? '');
  const [activeDescription, setActiveDescription] =
    useState<MovieDescriptionLocale | null>(description);
  const [activeDurationLabel, setActiveDurationLabel] = useState(durationLabel);
  const skipCloseAnim = useRef(false);

  const isSaved = activeId != null && savedIds.includes(activeId);

  const videoId = useMemo(
    () => extractYoutubeVideoId(activeTrailerUrl),
    [activeTrailerUrl]
  );

  useEffect(() => {
    collapsedHSV.value = openH;
    fullHSV.value = fullH;
    if (expanded.value < 0.5) {
      sheetH.value = openH;
    } else {
      sheetH.value = fullH;
    }
  }, [openH, fullH, collapsedHSV, fullHSV, sheetH, expanded]);

  useEffect(() => {
    if (!visible) return;
    setActiveId(movieId ?? null);
    setActiveTrailerUrl(trailerUrl ?? '');
    setActiveWatchUrl(watchUrl ?? '');
    setActiveTitle(movieTitle ?? '');
    setActiveDescription(description);
    setActiveDurationLabel(durationLabel);
  }, [visible, movieId, trailerUrl, watchUrl, movieTitle, description, durationLabel]);

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
      expanded.value = 0;
      sheetH.value = openH;
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

    const current = (1 - progress.value) * sheetH.value + dragY.value;
    progress.value = 1;
    dragY.value = current;
    dragY.value = withTiming(
      sheetH.value,
      { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          progress.value = 0;
          dragY.value = 0;
          expanded.value = 0;
          runOnJS(setMounted)(false);
        }
      }
    );
  }, [visible, progress, dragY, mounted, sheetH, expanded, openH]);

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
    expanded.value = 0;
    skipCloseAnim.current = true;
    setPlaying(false);
    setDescOpen(false);
    onClose();
    setMounted(false);
  };

  const snapToCollapsed = () => {
    'worklet';
    expanded.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    sheetH.value = withTiming(collapsedHSV.value, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    dragY.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const snapToFull = () => {
    'worklet';
    expanded.value = withTiming(1, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    sheetH.value = withTiming(fullHSV.value, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
    dragY.value = withTiming(0, {
      duration: SNAP_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const snapClose = () => {
    'worklet';
    const remaining = Math.max(0, sheetH.value - dragY.value);
    const duration = Math.max(
      140,
      Math.min(CLOSE_MS, (remaining / Math.max(sheetH.value, 1)) * CLOSE_MS)
    );
    dragY.value = withTiming(
      sheetH.value,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  };

  const pan = Gesture.Pan()
    .enabled(!descOpen)
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      const isFull = expanded.value > 0.5;
      const collapsed = collapsedHSV.value;
      const full = fullHSV.value;

      if (isFull) {
        sheetH.value = Math.min(
          full,
          Math.max(collapsed, full - Math.max(0, e.translationY))
        );
        dragY.value = 0;
        return;
      }

      if (e.translationY < 0) {
        const travel = full - collapsed;
        sheetH.value = Math.min(
          full,
          collapsed + Math.min(travel, -e.translationY * 1.35)
        );
        dragY.value = 0;
      } else {
        sheetH.value = collapsed;
        dragY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      const isFull = expanded.value > 0.5;
      const collapsed = collapsedHSV.value;
      const full = fullHSV.value;
      const travel = Math.max(1, full - collapsed);

      if (isFull) {
        if (sheetH.value < collapsed + travel * 0.55 || e.velocityY > 700) {
          snapToCollapsed();
        } else {
          snapToFull();
        }
        return;
      }

      if (sheetH.value > collapsed + travel * 0.18 || e.velocityY < -500) {
        snapToFull();
        return;
      }
      if (dragY.value > collapsed * 0.16 || e.velocityY > 800) {
        snapClose();
        return;
      }
      snapToCollapsed();
    });

  const onStateChange = useCallback((state: PLAYER_STATES) => {
    if (state === PLAYER_STATES.ENDED) setPlaying(false);
  }, []);

  const openDescription = () => {
    setPlaying(false);
    setDescOpen(true);
  };

  const onWatch = async () => {
    const target = activeWatchUrl?.trim();
    if (!target) return;
    setPlaying(false);
    try {
      await Linking.openURL(target);
    } catch {
      // ignore invalid / unsupported urls
    }
  };

  const onToggleSave = async () => {
    if (activeId == null || saveBusy) return;
    setSaveBusy(true);
    try {
      await toggleSave(activeId);
    } finally {
      setSaveBusy(false);
    }
  };

  const selectSimilar = (movie: Movie) => {
    const nextDesc = movie.description?.[lang] ?? movie.description?.uz ?? null;
    setActiveId(movie.id);
    setActiveTrailerUrl(movie.trailers ?? '');
    setActiveWatchUrl(movie.watchUrl ?? '');
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
      Math.max(0, 1 - dragY.value / (sheetH.value + 1)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetH.value,
    transform: [
      {
        translateY: (1 - progress.value) * sheetH.value + dragY.value,
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

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.accentBright }]}
                onPress={onWatch}
                disabled={!activeWatchUrl?.trim()}
              >
                <PlayIcon size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnTextPrimary}>{t('movie.watch')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor: colors.borderSoft,
                    borderWidth: 1,
                  },
                ]}
                onPress={onToggleSave}
                disabled={activeId == null || saveBusy}
              >
                <BookmarkIcon
                  size={16}
                  color={isSaved ? SAVE_ACTIVE : colors.icon}
                  filled={isSaved}
                />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  {t('movie.save')}
                </Text>
              </Pressable>
            </View>
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
    fontSize: 20,
    fontWeight: '700',
  },
  descBlock: {
    gap: 4,
  },
  descText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  moreInfo: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  similarSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  similarTitle: {
    fontSize: 18,
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
    ...StyleSheet.absoluteFill,
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
