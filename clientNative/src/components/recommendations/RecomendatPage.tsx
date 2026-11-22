import { MovieCard, MovieCardSkeleton } from '@/components/movie/MovieCard';
import { SkeletonGroup } from '@/components/common/SkeletonPulse';
import { ChevronLeftIcon } from '@/components/icons';
import type { MovieSection } from '@/src/api/movie-sections';
import { useMovieSection } from '@/src/hooks/useMovieSection';
import { useLanguageStore } from '@/src/stores/useLanguageStore';
import { useTheme } from '@/src/stores/useThemeStore';
import type { MovieCardData } from '@/src/types/movie';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAD = 16;
const GAP = 12;
const movieKey = (movie: MovieCardData) => String(movie.id);

function SkeletonCards({ width }: { width: number }) {
  return <SkeletonGroup style={styles.skeletonGrid}>
    {Array.from({ length: 6 }, (_, index) => <MovieCardSkeleton key={index} width={width} />)}
  </SkeletonGroup>;
}

export function RecomendatPage({ categoryName }: { categoryName: MovieSection }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useLanguageStore(state => state.language);
  const { items, loading, loaded, hasMore, error, pager, loadNext, retry } = useMovieSection(categoryName);
  const cardWidth = Math.max(1, Math.floor((width - insets.left - insets.right - PAD * 2 - GAP) / 2));
  const rowHeight = Math.round(cardWidth * 1.3) + 44;
  const contentOffset = useMemo(() => ({ x: 0, y: pager.getScrollTop() }), [pager]);
  const renderItem = useCallback(({ item }: { item: MovieCardData }) => (
    <MovieCard movie={item} language={language} width={cardWidth} />
  ), [language, cardWidth]);
  const itemLayout = useCallback((_data: unknown, row: number) => ({ length: rowHeight, offset: PAD + row * rowHeight, index: row }), [rowHeight]);
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };

  return <View style={[styles.root, { backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }]}>
    <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.borderSoft }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('listing.back')} onPress={back} style={[styles.back, { backgroundColor: colors.panelSoft }]}>
        <ChevronLeftIcon size={24} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>{t(`home.categories.${categoryName}`)}</Text>
    </View>
    <FlatList
      data={items}
      numColumns={2}
      keyExtractor={movieKey}
      renderItem={renderItem}
      getItemLayout={itemLayout}
      columnWrapperStyle={styles.columns}
      contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: PAD, paddingBottom: Math.max(insets.bottom, 16) }}
      contentOffset={contentOffset}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      showsVerticalScrollIndicator={false}
      onEndReached={loadNext}
      onEndReachedThreshold={0.6}
      scrollEventThrottle={32}
      onScroll={event => pager.setScrollTop(Math.max(0, event.nativeEvent.contentOffset.y))}
      ListEmptyComponent={!loaded && !error ? <SkeletonCards width={cardWidth} /> : !error ? <Text style={[styles.notice, { color: colors.text }]}>{t('listing.empty')}</Text> : null}
      ListFooterComponent={<>
        {loading && items.length > 0 ? <SkeletonCards width={cardWidth} /> : null}
        {error ? <View accessibilityLiveRegion="polite" style={styles.error}>
          <Text style={{ color: colors.text, textAlign: 'center' }}>{t('listing.error')}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={[styles.retry, { backgroundColor: colors.panelSoft }]}>
            <Text style={{ color: colors.text }}>{t('listing.retry')}</Text>
          </Pressable>
        </View> : null}
        {loaded && hasMore && !loading && !error ? <Pressable accessibilityRole="button" onPress={loadNext} style={[styles.retry, { backgroundColor: colors.panelSoft }]}>
          <Text style={{ color: colors.text }}>{t('listing.more')}</Text>
        </Pressable> : null}
      </>}
    />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: PAD, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  columns: { gap: GAP, alignItems: 'flex-start' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP },
  notice: { textAlign: 'center', paddingVertical: 40 },
  error: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  retry: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
});
