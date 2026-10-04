import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HorizontalScroll } from '@/components/common/HorizontalScroll';
import { MovieCard } from '@/components/movie/MovieCard';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { fetchMovies } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie } from '@/src/types/movie';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PAD = 16;
const GAP = 12;
const HEADER_ROW = 44;

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);
  const language = useLanguageStore((s) => s.language);
  const loadWishlistIds = useWishlistStore((s) => s.loadIds);
  const { width } = useWindowDimensions();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerH = insets.top + 10 + HEADER_ROW;
  const cardWidth = useMemo(() => Math.round(width * 0.42), [width]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchMovies(), loadWishlistIds()])
      .then(([list]) => {
        if (!alive) return;
        setMovies(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Load failed');
        setMovies([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadWishlistIds]);

  const goToChat = () => {
    router.push('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {loading ? (
        <View style={[styles.center, { paddingTop: headerH }]}>
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : error || movies.length === 0 ? (
        <View
          style={[
            styles.emptyWrap,
            {
              paddingTop: headerH + 8,
              paddingBottom: navOffset + 8,
              paddingHorizontal: CONTENT_PAD,
            },
          ]}
        >
          <HomeEmptyState onGoToChat={goToChat} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: headerH + 12,
            paddingBottom: navOffset + 12,
          }}
        >
          <HorizontalScroll
            contentContainerStyle={[
              styles.row,
              { paddingHorizontal: CONTENT_PAD },
            ]}
          >
            {movies.map((movie) => (
              <View key={movie.id} style={{ width: cardWidth, marginRight: GAP }}>
                <MovieCard
                  movie={movie}
                  language={language}
                  width={cardWidth}
                />
              </View>
            ))}
          </HorizontalScroll>
        </ScrollView>
      )}

      <View
        style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerInner} pointerEvents="box-none">
          <HomeHeader />
        </View>
      </View>

      <FloatingAiButton onPress={goToChat} />
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
  emptyWrap: {
    flex: 1,
  },
  row: {
    alignItems: 'flex-start',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  headerInner: {
    paddingHorizontal: CONTENT_PAD,
    height: HEADER_ROW,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
