import { BookmarkIcon, ChevronLeftIcon } from '@/components/icons';
import { fetchMovieById } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie } from '@/src/types/movie';
import { resolveMoviePoster } from '@/src/utils/moviePosters';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const posterH = Math.round(width * 1.35);

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
              <Image source={poster} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.panelSoft }]} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
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
  title: {
    marginTop: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
});
