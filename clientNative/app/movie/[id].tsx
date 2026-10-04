import {
  AgeRatingIcon,
  BookmarkIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  DislikeIcon,
  GlobeIcon,
  HeartIcon,
  PlayIcon,
  VideoIcon,
} from '@/components/icons';
import { HorizontalScroll } from '@/components/common/HorizontalScroll';
import { fetchMovieById, toggleMovieReaction } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie } from '@/src/types/movie';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import {
  Oswald_700Bold,
  useFonts,
} from '@expo-google-fonts/oswald';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SAVE_ACTIVE = '#1E4FD6';
const LIKE_ACTIVE = '#22C55E';
const DISLIKE_ACTIVE = '#EF4444';

type SpecIconProps = { size?: number; color?: string };
type SpecItem = {
  key: string;
  label: string;
  Icon: ComponentType<SpecIconProps>;
};

async function openExternalUrl(url?: string) {
  const target = url?.trim();
  if (!target) return;
  try {
    await Linking.openURL(target);
  } catch {
    // ignore invalid / unsupported urls
  }
}

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const { width } = useWindowDimensions();
  const isSaved = useWishlistStore((s) => s.isSaved(movieId));
  const toggle = useWishlistStore((s) => s.toggle);
  const [fontsLoaded] = useFonts({
    Oswald_700Bold,
  });
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!Number.isFinite(movieId)) {
      setError('Invalid movie id');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchMovieById(movieId)
      .then((doc) => {
        if (!alive) return;
        setMovie(doc);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Load failed');
        setMovie(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [movieId]);

  const lang = language === 'en' ? 'uz' : language;
  const title = movie ? movie.title[lang] ?? movie.title.uz : '';
  const poster = movie ? resolveMoviePoster(movie.homeImgPoster) : null;
  const posterH = Math.round(width * 1.15);

  const fadeColors = useMemo(
    () =>
      [
        'transparent',
        hexToRgba(colors.bg, 0.2),
        hexToRgba(colors.bg, 0.5),
        hexToRgba(colors.bg, 0.78),
        hexToRgba(colors.bg, 0.94),
        colors.bg,
      ] as const,
    [colors.bg]
  );

  const specItems = useMemo((): SpecItem[] => {
    if (!movie?.specs) return [];
    const { year, duration, ageRating, countries } = movie.specs;
    const durationLabel =
      language === 'ru'
        ? `${duration} мин`
        : language === 'en'
          ? `${duration} min`
          : `${duration} daq`;
    const items: SpecItem[] = [
      { key: 'year', label: String(year), Icon: CalendarIcon },
      { key: 'duration', label: durationLabel, Icon: ClockIcon },
      { key: 'age', label: ageRating, Icon: AgeRatingIcon },
      ...(countries ?? []).map((country, index) => ({
        key: `country-${index}-${country}`,
        label: country,
        Icon: GlobeIcon,
      })),
    ];
    return items.filter((item) => Boolean(item.label));
  }, [movie, language]);

  const genres = useMemo(() => {
    if (!movie) return [];
    return movie.genre[lang] ?? movie.genre.uz ?? [];
  }, [movie, lang]);

  const ratingItems = useMemo(() => {
    if (!movie) return [];
    const items: Array<{
      key: string;
      icon: number;
      value: string;
    }> = [];
    if (movie.ratingImdb != null) {
      items.push({
        key: 'imdb',
        icon: require('@/assets/images/imdbnew.png'),
        value: Number(movie.ratingImdb).toFixed(1),
      });
    }
    if (movie.ratingKinopoisk != null) {
      items.push({
        key: 'kp',
        icon: require('@/assets/images/kinopoisk.jpg'),
        value: Number(movie.ratingKinopoisk).toFixed(1),
      });
    }
    return items;
  }, [movie]);

  const onToggleSave = async () => {
    if (!movie || busy) return;
    setBusy(true);
    try {
      await toggle(movie.id);
    } finally {
      setBusy(false);
    }
  };

  const onToggleReaction = async (type: 'like' | 'dislike') => {
    if (!movie || reactionBusy) return;
    setReactionBusy(true);
    try {
      const result = await toggleMovieReaction(movie.id, type);
      setMovie((prev) =>
        prev
          ? {
              ...prev,
              like: result.like,
              dislike: result.dislike,
              userReaction: result.userReaction,
            }
          : prev
      );
    } finally {
      setReactionBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : error || !movie ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            {error || 'Movie not found'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View style={[styles.posterWrap, { height: posterH }]}>
            {poster ? (
              <Image
                source={poster}
                style={styles.poster}
                contentFit="cover"
                contentPosition="top"
              />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.panelSoft }]} />
            )}
            <LinearGradient
              colors={[...fadeColors]}
              locations={[0, 0.18, 0.4, 0.62, 0.82, 1]}
              style={styles.fade}
              pointerEvents="none"
            />
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontFamily: fontsLoaded ? 'Oswald_700Bold' : undefined,
                },
              ]}
            >
              {title}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            {specItems.length > 0 ? (
              <HorizontalScroll contentContainerStyle={styles.specsRow}>
                {specItems.map(({ key, label, Icon }) => (
                  <View
                    key={key}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Icon size={14} color={colors.icon} />
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </HorizontalScroll>
            ) : null}

            {ratingItems.length > 0 || genres.length > 0 ? (
              <HorizontalScroll contentContainerStyle={styles.specsRow}>
                {ratingItems.map(({ key, icon, value }) => (
                  <View
                    key={key}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Image
                      source={icon}
                      style={styles.ratingIcon}
                      contentFit="cover"
                    />
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {value}
                    </Text>
                  </View>
                ))}
                {genres.map((genre) => (
                  <View
                    key={genre}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: colors.panelSoft,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    <Text style={[styles.specText, { color: colors.text }]}>
                      {genre}
                    </Text>
                  </View>
                ))}
              </HorizontalScroll>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.accentBright }]}
                onPress={() => openExternalUrl(movie.watchUrl)}
              >
                <PlayIcon size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>{t('movie.watch')}</Text>
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
                onPress={() => openExternalUrl(movie.trailers)}
              >
                <VideoIcon size={16} color={colors.icon} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  {t('movie.trailer')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.reactionRow}>
              <Pressable
                style={[
                  styles.reactionBtn,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor:
                      movie.userReaction === 'like'
                        ? LIKE_ACTIVE
                        : colors.borderSoft,
                  },
                ]}
                onPress={() => onToggleReaction('like')}
                disabled={reactionBusy}
              >
                <HeartIcon
                  size={18}
                  color={
                    movie.userReaction === 'like' ? LIKE_ACTIVE : colors.icon
                  }
                  filled={movie.userReaction === 'like'}
                />
                <Text
                  style={[
                    styles.reactionText,
                    {
                      color:
                        movie.userReaction === 'like'
                          ? LIKE_ACTIVE
                          : colors.text,
                    },
                  ]}
                >
                  {movie.like || '0'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.reactionBtn,
                  {
                    backgroundColor: colors.panelSoft,
                    borderColor:
                      movie.userReaction === 'dislike'
                        ? DISLIKE_ACTIVE
                        : colors.borderSoft,
                  },
                ]}
                onPress={() => onToggleReaction('dislike')}
                disabled={reactionBusy}
              >
                <DislikeIcon
                  size={18}
                  color={
                    movie.userReaction === 'dislike'
                      ? DISLIKE_ACTIVE
                      : colors.icon
                  }
                  filled={movie.userReaction === 'dislike'}
                />
                <Text
                  style={[
                    styles.reactionText,
                    {
                      color:
                        movie.userReaction === 'dislike'
                          ? DISLIKE_ACTIVE
                          : colors.text,
                    },
                  ]}
                >
                  {movie.dislike || '0'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[
            styles.circleBtn,
            { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.icon} />
        </Pressable>

        {movie ? (
          <Pressable
            style={[
              styles.circleBtn,
              { backgroundColor: colors.panelSoft, borderColor: colors.borderSoft },
            ]}
            onPress={onToggleSave}
            disabled={busy}
          >
            <BookmarkIcon
              size={18}
              color={isSaved ? SAVE_ACTIVE : colors.icon}
              filled={isSaved}
            />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  posterWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  title: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    zIndex: 2,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 1,
    transform: [{ skewX: '-14deg' }],
  },
  infoBlock: {
    gap: 8,
    paddingTop: 10,
  },
  specsRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  specText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  actionRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reactionRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  reactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
