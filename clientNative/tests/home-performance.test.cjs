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
    'react-native': { StyleSheet: { create: value => value }, Text: 'text', View: 'view' },
    'react-native-gesture-handler': { FlatList: 'virtual-list' },
    '@/components/movie/MovieCard': { MovieCard: 'movie-card' },
    '@/src/stores/useThemeStore': { useTheme: () => ({ colors: {} }) },
  });
  const tree = MovieCategoryRow({ title: 'Movies', movies, language: 'uz', cardWidth: 150 });
  const list = tree.props.children[1];
  assert.equal(list.type, 'virtual-list');
  assert.equal(list.props.children, undefined);
  assert.equal(list.props.data.length, 1000);
  assert.ok(list.props.initialNumToRender < 10);
  const last = list.props.renderItem({ item: movies[999] });
  assert.equal(last.props.children.props.movie.id, 999);
  assert.equal(list.props.keyExtractor(movies[999]), '999');
});

test('unmounting a skeleton cancels its repeating animation', () => {
  let cleanup, cancelled, repeats = 0;
  const shared = { value: 0.45 };
  const { SkeletonLoader } = load('components/common/SkeletonLoader.tsx', {
    react: { useEffect: fn => { cleanup = fn(); } },
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
  SkeletonLoader({ width: 150, height: 200 });
  assert.equal(repeats, 1);
  assert.equal(cancelled, undefined);
  cleanup();
  assert.equal(cancelled, shared);
});
