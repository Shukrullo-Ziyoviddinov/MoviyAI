const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', 'module', code)(
    name => mocks[name] ?? require(name), module.exports, module,
  );
  return module.exports;
}

test('large movie rows defer card creation to the virtualized list and preserve late items', () => {
  const movies = Array.from({ length: 1000 }, (_, id) => ({ id }));
  const { MovieCategoryRow } = load('components/movie/MovieCategoryRow.tsx', {
    'react-native': { StyleSheet: { create: value => value }, Text: 'text', View: 'view', FlatList: 'virtual-list' },
    '@/components/movie/MovieCard': { MovieCard: 'movie-card' },
    '@/src/stores/useThemeStore': { useTheme: () => ({ colors: {} }) },
  });
  const tree = MovieCategoryRow.type({ title: 'Movies', movies, language: 'uz', cardWidth: 150 });
  const list = tree.props.children[1];
  assert.equal(list.type, 'virtual-list');
  assert.equal(list.props.children, undefined);
  assert.equal(list.props.data.length, 1000);
  assert.ok(list.props.initialNumToRender < 10);
  const last = list.props.renderItem({ item: movies[999] });
  assert.equal(last.props.children.props.movie.id, 999);
  assert.equal(list.props.keyExtractor(movies[999]), '999');
});

test('leaving a screen cancels its skeleton animation and returning restarts it', () => {
  let cleanup, focus, cancelled, repeats = 0;
  const shared = { value: 0.45 };
  const { useSkeletonAnimation } = load('components/common/SkeletonPulse.tsx', {
    react: { createContext: value => ({ value }), useCallback: fn => fn, useContext: () => ({ opacity: shared, subscribe: () => { repeats++; return () => { cancelled = shared; }; } }) },
    './SkeletonPulse': { SkeletonPulseContext: {} },
    'expo-router': { useFocusEffect: fn => { focus = fn; cleanup = fn(); } },
    'react-native': { StyleSheet: { create: value => value } },
    '@/src/stores/useThemeStore': { useTheme: () => ({ isDark: true }) },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'animated-view' },
      Easing: { inOut: value => value, ease: {} },
      useSharedValue: () => shared, useAnimatedStyle: fn => fn(),
      withTiming: () => ({}), withRepeat: () => { repeats++; return {}; },
      cancelAnimation: value => { cancelled = value; },
    },
  });
  useSkeletonAnimation();
  assert.equal(repeats, 1);
  assert.equal(cancelled, undefined);
  cleanup();
  assert.equal(cancelled, shared);
  focus();
  assert.equal(repeats, 2);
});

test('home poster decoding can downscale instead of retaining full-size fill bitmaps', () => {
  const { MovieCard } = load('components/movie/MovieCard.tsx', {
    react: { memo: fn => ({ type: fn }), useMemo: fn => fn(), useState: value => [value, () => {}] },
    'react-native': { View: 'view', Text: 'text', Pressable: 'pressable', StyleSheet: { create: value => value, absoluteFill: {} } },
    'expo-image': { Image: 'poster-image' },
    'react-native-svg': { __esModule: true, default: 'svg', Text: 'svg-text' },
    'expo-router': { router: {}, useFocusEffect() {} },
    '@/components/common/SkeletonPulse': { SkeletonGroup: 'skeleton-group' },
    '@/components/common/SkeletonLoader': { SkeletonLoader: 'skeleton' },
    '@/components/icons': { BookmarkIcon: 'bookmark' },
    '@/src/utils/movieDisplay': { displayMovieTitle: () => 'Movie', displayMovieRating: () => ({}) },
    '@/src/utils/moviePosters': { resolveMoviePoster: () => ({ uri: 'https://example.test/large.jpg' }) },
    '@/src/stores/useAuthStore': { useAuthStore: fn => fn({ requireAuth() {} }) },
    '@/src/stores/useWishlistStore': { useWishlistStore: fn => fn({ isSaved: () => false, toggle() {} }) },
    '@/src/stores/useThemeStore': { useTheme: () => ({ colors: {} }) },
  });
  const tree = MovieCard.type({ movie: { id: 42, homeImgPoster: 'large.jpg' }, language: 'uz', width: 150 });
  const image = tree.props.children[0].props.children.find(child => child?.type === 'poster-image');
  assert.ok(['cover', 'contain', 'scale-down'].includes(image.props.contentFit));
  assert.equal(image.props.allowDownscaling, true);
  assert.equal(image.props.cachePolicy, 'memory-disk');
});

test('home preserves its list and banner identity across loading, success and error states', () => {
  const state = { movies: [], topSearched: [], loadTopSearched: async () => {}, loading: true, loaded: false, error: null };
  const { default: Home } = load('app/home.tsx', {
    react: { useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn, useState: value => [value, () => {}] },
    'react-native': { FlatList: 'list', View: 'view', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 400 }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'expo-router': { router: {}, useFocusEffect() {} },
    '@/components/common/SkeletonLoader': { SkeletonLoader: 'skeleton' },
    '@/components/common/SkeletonPulse': { SkeletonGroup: 'skeleton-group' },
    '@/components/home/FloatingAiButton': { FloatingAiButton: 'ai-button' },
    '@/components/home/HomeEmptyState': { HomeEmptyState: 'empty' },
    '@/components/home/HomeBanner': { HomeBanner: 'banner', homeBannerHeight: width => width },
    '@/components/home/HomeHeader': { HomeHeader: 'header' },
    '@/components/movie/MovieCard': { MovieCardSkeleton: 'card-skeleton' },
    '@/components/movie/MovieCategoryRow': { MovieCategoryRow: 'row' },
    '@/components/nav/BottomNav': { useBottomNavOffset: () => 80 },
    '@/src/stores/useLanguageStore': { useLanguageStore: fn => fn({ language: 'uz' }) },
    '@/src/stores/useMoviesStore': { useMoviesStore: fn => fn(state) },
    '@/src/stores/useWishlistStore': { useWishlistStore: fn => fn({ loadIds() {} }) },
    '@/src/stores/useThemeStore': { useTheme: () => ({ colors: {} }) },
    '@/src/utils/groupMovies': { groupMoviesByCategory: movies => movies.length ? [{ categoryName: 'actionMovies', movies }] : [] },
  });
  const loading = Home().props.children[0];
  state.movies = [{ id: 42 }]; state.loading = false; state.loaded = true;
  const loaded = Home().props.children[0];
  state.topSearched = [{ id: 42 }];
  const rankedList = Home().props.children[0];
  assert.equal(rankedList.props.data.length, 2);
  assert.equal(rankedList.props.data[0].categoryName, 'topSearchedMovies');
  assert.equal(rankedList.props.data[1].movies[0].id, 42);
  const rankedRow = rankedList.props.renderItem({ item: rankedList.props.data[0], index: 0 });
  assert.equal(rankedRow.props.children.props.ranked, true);
  state.error = 'offline';
  const error = Home().props.children[0];
  for (const list of [loading, loaded, error]) {
    assert.equal(list.type, 'list');
    assert.equal(list.props.ListHeaderComponent.props.children.type, 'banner');
    assert.equal(list.key, null);
  }
  assert.equal(loading.props.scrollEnabled, true);
  assert.equal(loaded.props.scrollEnabled, true);
  assert.equal(loaded.props.data.length, 1);
});
