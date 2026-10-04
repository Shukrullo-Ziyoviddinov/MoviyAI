import {
  AgeRatingIcon,
  BookmarkIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  GlobeIcon,
} from '@/components/icons';
import { HorizontalScroll } from '@/components/common/HorizontalScroll';
import { fetchMovieById } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie } from '@/src/types/movie';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SAVE_ACTIVE = '#1E4FD6';

type SpecIconProps = { size?: number; color?: string };
type SpecItem = {
  key: string;
  label: string;
  Icon: ComponentType<SpecIconProps>;
};

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const { width } = useWindowDimensions();
  const isSaved = useWishlistStore((s) => s.isSaved(movieId));
  const toggle = useWishlistStore((s) => s.toggle);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        hexToRgba(colors.bg, 0.25),
        hexToRgba(colors.bg, 0.58),
        hexToRgba(colors.bg, 0.85),
        hexToRgba(colors.bg, 0.96),
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
              locations={[0, 0.22, 0.45, 0.68, 0.86, 1]}
              style={styles.fade}
              pointerEvents="none"
            />
            <View style={styles.metaBlock}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
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
    height: '72%',
  },
  metaBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    zIndex: 2,
    gap: 8,
  },
  title: {
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
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
});
