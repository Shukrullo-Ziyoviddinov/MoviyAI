import { SkeletonGroup } from '@/components/common/SkeletonPulse';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { FloatingAiButton } from '@/components/home/FloatingAiButton';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { HomeBanner, homeBannerHeight } from '@/components/home/HomeBanner';
import { HomeHeader } from '@/components/home/HomeHeader';
import { MovieCardSkeleton } from '@/components/movie/MovieCard';
import { MovieCategoryRow } from '@/components/movie/MovieCategoryRow';
import { useBottomNavOffset } from '@/components/nav/BottomNav';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useMoviesStore } from '@/src/stores/useMoviesStore';
import { useTheme } from '@/src/stores/useThemeStore';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { groupMoviesByCategory } from '@/src/utils/groupMovies';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PAD = 16;
const HEADER_ROW = 44;
const CARD_GAP = 12;
const SKELETON_CARDS = 3;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navOffset = useBottomNavOffset(true);
  const language = useLanguageStore((s) => s.language);
  const movies = useMoviesStore((s) => s.movies);
  const topSearched = useMoviesStore((s) => s.topSearched);
  const weeklySearched = useMoviesStore((s) => s.weeklySearched);
  const loadTopSearched = useMoviesStore((s) => s.loadTopSearched);
  const loading = useMoviesStore((s) => s.loading);
  const loaded = useMoviesStore((s) => s.loaded);
  const error = useMoviesStore((s) => s.error);
  const loadMovies = useMoviesStore((s) => s.loadMovies);
  const loadWishlistIds = useWishlistStore((s) => s.loadIds);
  const { width, height } = useWindowDimensions();
  const [bannerOn, setBannerOn] = useState(true);

  const headerH = insets.top + 10 + HEADER_ROW;
  const bannerH = homeBannerHeight(width);
  const afterBanner = [styles.afterBanner, { backgroundColor: colors.bg }];
  const bannerSlot = useMemo(() => ({
    height: bannerOn ? bannerH : 0,
    maxHeight: bannerOn ? bannerH : 0,
    overflow: 'hidden' as const,
    flexGrow: 0,
    flexShrink: 0,
  }), [bannerOn, bannerH]);
  const cardWidth = useMemo(() => Math.round(width * 0.39), [width]);
  const showSkeleton = movies.length === 0 && !error && (loading || !loaded);
  const regularCategories = useMemo(() => groupMoviesByCategory(movies), [movies]);
  const categories = useMemo(() => [
    ...(topSearched.length ? [{ categoryName: 'topSearchedMovies', movies: topSearched }] : []),
    ...(weeklySearched.length ? [{ categoryName: 'weeklyTopSearchedMovies', movies: weeklySearched }] : []),
    ...regularCategories,
  ], [regularCategories, topSearched, weeklySearched]);
  useFocusEffect(useCallback(() => {
    void loadTopSearched();
    const timer = setInterval(() => { void loadTopSearched(); }, 60000);
    return () => clearInterval(timer);
  }, [loadTopSearched]));

  useEffect(() => {
    void loadMovies();
    void loadWishlistIds();
  }, [loadMovies, loadWishlistIds]);

  const goToChat = useCallback(() => router.push('/'), []);
  const header = useMemo(() => (
    <View style={bannerSlot} collapsable={false}>
      <HomeBanner onVisible={setBannerOn} />
    </View>
  ), [bannerSlot]);
  const renderCategory = useCallback(({ item: group, index }: {
    item: (typeof categories)[number]; index: number;
  }) => (
    <View style={index === 0 ? styles.afterBanner : undefined}>
      <MovieCategoryRow
        title={t(`home.categories.${group.categoryName}`)}
        ranked={group.categoryName === 'topSearchedMovies' || group.categoryName === 'weeklyTopSearchedMovies'}
        movies={group.movies}
        language={language}
        cardWidth={cardWidth}
        contentPad={CONTENT_PAD}
      />
    </View>
  ), [t, language, cardWidth]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={error ? categories.filter(group => group.categoryName === 'topSearchedMovies' || group.categoryName === 'weeklyTopSearchedMovies') : categories}
        keyExtractor={(group) => group.categoryName}
        renderItem={renderCategory}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={5}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: bannerOn ? 0 : headerH,
          paddingBottom: navOffset + 12,
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={showSkeleton ? (
          <SkeletonGroup style={afterBanner}>
            {Array.from({ length: Math.max(1, Math.ceil(((height || 800) - bannerH) / (cardWidth * 1.3 + 98))) }, (_, row) => (
              <View key={row} style={styles.skelSection}>
                <SkeletonLoader
                  width={Math.round(cardWidth * 1.35)} height={22} borderRadius={8}
                  style={{ marginBottom: 12, marginLeft: CONTENT_PAD }}
                />
                <View style={[styles.skelRow, { paddingHorizontal: CONTENT_PAD }]}>
                  {Array.from({ length: SKELETON_CARDS }, (_, card) => (
                    <View key={card} style={{ width: cardWidth, marginRight: CARD_GAP }}>
                      <MovieCardSkeleton width={cardWidth} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </SkeletonGroup>
        ) : (
          <View style={[styles.emptyBody, afterBanner]}>
            <HomeEmptyState onGoToChat={goToChat} />
          </View>
        )}
      />

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
  emptyBody: {
    flex: 1,
    paddingHorizontal: CONTENT_PAD,
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
  afterBanner: {
    marginTop: 16,
  },
  skelSection: {
    marginBottom: 18,
  },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
