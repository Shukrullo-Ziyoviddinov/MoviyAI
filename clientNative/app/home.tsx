import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeHeader } from '@/components/home/HomeHeader';
import { MovieCardSkeleton } from '@/components/movie/MovieCard';
import { MovieCategoryRow } from '@/components/movie/MovieCategoryRow';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useMoviesStore } from '@/src/stores/useMoviesStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { groupMoviesByCategory } from '@/src/utils/groupMovies';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PAD = 16;
const HEADER_ROW = 44;
const CARD_GAP = 12;
const SKELETON_ROWS = 3;
const SKELETON_CARDS = 3;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);
  const language = useLanguageStore((s) => s.language);
  const movies = useMoviesStore((s) => s.movies);
  const loaded = useMoviesStore((s) => s.loaded);
  const error = useMoviesStore((s) => s.error);
  const loadMovies = useMoviesStore((s) => s.loadMovies);
  const loadWishlistIds = useWishlistStore((s) => s.loadIds);
  const { width } = useWindowDimensions();

  const headerH = insets.top + 10 + HEADER_ROW;
  const cardWidth = useMemo(() => Math.round(width * 0.39), [width]);
  const showSkeleton = !loaded && !error;
  const categories = useMemo(() => groupMoviesByCategory(movies), [movies]);

  useEffect(() => {
    void loadMovies();
    void loadWishlistIds();
  }, [loadMovies, loadWishlistIds]);

  const goToChat = () => {
    router.push('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {showSkeleton ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={{
            paddingTop: headerH + 12,
            paddingBottom: navOffset + 12,
          }}
        >
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <View key={row} style={styles.skelSection}>
              <SkeletonLoader
                width={Math.round(cardWidth * 1.35)}
                height={22}
                borderRadius={8}
                style={{ marginBottom: 12, marginLeft: CONTENT_PAD }}
              />
              <View style={[styles.skelRow, { paddingHorizontal: CONTENT_PAD }]}>
                {Array.from({ length: SKELETON_CARDS }, (_, card) => (
                  <View
                    key={card}
                    style={{ width: cardWidth, marginRight: CARD_GAP }}
                  >
                    <MovieCardSkeleton width={cardWidth} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error || categories.length === 0 ? (
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
          nestedScrollEnabled
          contentContainerStyle={{
            paddingTop: headerH + 12,
            paddingBottom: navOffset + 12,
          }}
        >
          {categories.map((group) => (
            <MovieCategoryRow
              key={group.categoryName}
              title={t(`home.categories.${group.categoryName}`)}
              movies={group.movies}
              language={language}
              cardWidth={cardWidth}
              contentPad={CONTENT_PAD}
            />
          ))}
        </ScrollView>
      )}

      <View
        style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerInner} pointerEvents="box-none">
          <HomeHeader onSearchPress={() => router.push('/search')} />
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
  emptyWrap: {
    flex: 1,
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
  skelSection: {
    marginBottom: 18,
  },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
