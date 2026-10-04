import { FavoritesEmptyState } from '@/components/favorites/FavoritesEmptyState';
import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeHeader } from '@/components/home/HomeHeader';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { fetchWishlistMovies } from '@/src/api/wishlist';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import type { Movie } from '@/src/types/movie';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
const HEADER_ROW = 44;

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);
  const language = useLanguageStore((s) => s.language);
  const loadWishlistIds = useWishlistStore((s) => s.loadIds);
  const { width } = useWindowDimensions();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const headerH = insets.top + 10 + HEADER_ROW;
  const cardWidth = useMemo(
    () => (width - CONTENT_PAD * 2 - GAP) / 2,
    [width]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list] = await Promise.all([fetchWishlistMovies(), loadWishlistIds()]);
      setMovies(list);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [loadWishlistIds]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const goToChat = () => {
    router.push('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {loading ? (
        <View style={[styles.center, { paddingTop: headerH }]}>
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : movies.length === 0 ? (
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
          <FavoritesEmptyState onGoToChat={goToChat} />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            {
              paddingTop: headerH + 10,
              paddingBottom: navOffset + 12,
              paddingHorizontal: CONTENT_PAD,
            },
          ]}
          renderItem={({ item }) => (
            <WishlistCard
              movie={item}
              language={language}
              width={cardWidth}
              onRemoved={(movieId) =>
                setMovies((prev) => prev.filter((m) => m.id !== movieId))
              }
            />
          )}
        />
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
  list: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
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
