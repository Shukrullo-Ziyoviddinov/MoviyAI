import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { MovieCard } from '@/components/movie/MovieCard';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { fetchMovies } from '@/src/api/movies';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { Movie } from '@/src/types/movie';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PAD = 16;
const GAP = 12;

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);
  const language = useLanguageStore((s) => s.language);
  const { width } = useWindowDimensions();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = useMemo(
    () => (width - CONTENT_PAD * 2 - GAP) / 2,
    [width]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMovies()
      .then((list) => {
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
  }, []);

  const goToChat = () => {
    router.push('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: navOffset + 8,
            paddingHorizontal: CONTENT_PAD,
          },
        ]}
      >
        <HomeHeader />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accentBright} />
          </View>
        ) : error || movies.length === 0 ? (
          <HomeEmptyState onGoToChat={goToChat} />
        ) : (
          <FlatList
            data={movies}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <MovieCard movie={item} language={language} width={cardWidth} />
            )}
          />
        )}
      </View>

      <FloatingAiButton onPress={goToChat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
});
