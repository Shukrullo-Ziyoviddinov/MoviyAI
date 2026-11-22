const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', 'module', code)(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module.exports, module);
  return module.exports;
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const createPager = read => load('src/utils/movie-section-pager.ts', { '@/src/api/movie-sections': {} }).createMovieSectionPager('dramaMovies', read);

test('native pagination blocks duplicate end events and retries the same cursor without losing loaded cards', async () => {
  const first = deferred();
  const calls = [];
  const store = createPager((_category, cursor) => {
    calls.push(cursor);
    if (calls.length === 1) return first.promise;
    if (calls.length === 2) return Promise.reject(Error('offline'));
    return Promise.resolve({ items: [{ id: 2 }, { id: 3 }], nextCursor: null, hasMore: false });
  });
  const pending = store.load(); await store.load();
  assert.deepEqual(calls, [null]);
  first.resolve({ items: [{ id: 1 }, { id: 2 }], nextCursor: 'next', hasMore: true }); await pending;
  await store.load();
  assert.equal(store.getSnapshot().error, true);
  assert.deepEqual(store.getSnapshot().items.map(m => m.id), [1, 2]);
  await store.load(); await store.load();
  assert.deepEqual(calls, [null, 'next', 'next']);
  assert.deepEqual(store.getSnapshot().items.map(m => m.id), [1, 2, 3]);
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(store.getSnapshot().hasMore, false);
});

test('native blur aborts the active page; its late response cannot replace a fresh response', async () => {
  const old = deferred(), next = deferred(); const signals = [];
  const store = createPager((_category, _cursor, signal) => { signals.push(signal); return signals.length === 1 ? old.promise : next.promise; });
  const a = store.load(); store.setScrollTop(800); store.cancel();
  assert.equal(signals[0].aborted, true);
  const b = store.load();
  next.resolve({ items: [{ id: 2 }], nextCursor: null, hasMore: false }); await b;
  old.resolve({ items: [{ id: 1 }], nextCursor: null, hasMore: false }); await a;
  assert.deepEqual(store.getSnapshot().items, [{ id: 2 }]);
  assert.equal(store.getScrollTop(), 800);
});

test('native recommendation page virtualizes two columns and appends skeletons without replacing its list', () => {
  const state = { items: Array.from({ length: 1000 }, (_, id) => ({ id })), loading: true, loaded: true, hasMore: true, error: false, pager: { getScrollTop: () => 0, setScrollTop() {} }, loadNext() {}, retry() {} };
  const { RecomendatPage } = load('src/components/recommendations/RecomendatPage.tsx', {
    react: { useCallback: fn => fn, useMemo: fn => fn() },
    'react-native': { FlatList: 'list', View: 'view', Text: 'text', Pressable: 'button', StyleSheet: { create: x => x }, useWindowDimensions: () => ({ width: 400 }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'expo-router': { router: {} },
    '@/components/movie/MovieCard': { MovieCard: 'card', MovieCardSkeleton: 'bone' },
    '@/components/common/SkeletonPulse': { SkeletonGroup: 'bones' },
    '@/components/icons': { ChevronLeftIcon: 'back' },
    '@/src/stores/useThemeStore': { useTheme: () => ({ colors: {} }) },
    '@/src/stores/useLanguageStore': { useLanguageStore: fn => fn({ language: 'uz' }) },
    '@/src/hooks/useMovieSection': { useMovieSection: () => state },
  });
  const list = RecomendatPage({ categoryName: 'dramaMovies' }).props.children[1];
  assert.equal(list.type, 'list');
  assert.equal(list.props.numColumns, 2);
  assert.equal(list.props.horizontal, undefined);
  assert.equal(list.props.data.length, 1000);
  assert.equal(list.props.children, undefined);
  assert.ok(list.props.initialNumToRender <= 6);
  assert.ok(list.props.maxToRenderPerBatch <= 4);
  assert.equal(list.props.renderItem({ item: state.items[999] }).props.movie.id, 999);
  assert.equal(typeof list.props.ListFooterComponent.props.children[0].type, 'function');
  state.loading = false; state.hasMore = false;
  const finished = RecomendatPage({ categoryName: 'dramaMovies' }).props.children[1];
  assert.equal(finished.type, list.type);
  assert.equal(finished.props.ListFooterComponent.props.children[0], null);
  assert.equal(finished.props.ListFooterComponent.props.children[2], null);
});

test('native Home downloads section previews instead of the full movie collection', async () => {
  let state, calls = 0;
  load('src/stores/useMoviesStore.ts', {
    zustand: { create: init => { state = init(patch => { state = { ...state, ...patch }; }, () => state); return {}; } },
    '@/src/api/movies': { fetchMovies: () => { throw Error('full collection must not load'); } },
    '@/src/api/movie-sections': { fetchHomeSections: async () => { calls++; return [{ categoryName: 'dramaMovies', movies: [{ id: 1 }] }]; } },
  });
  await state.loadMovies(); await state.loadMovies();
  assert.equal(calls, 1);
  assert.deepEqual(state.movies, [{ id: 1 }]);
});

test('native empty section stops requests and initial errors retry from the beginning', async () => {
  const cursors = [];
  const store = createPager(async (_category, cursor) => {
    cursors.push(cursor);
    if (cursors.length === 1) throw Error('offline');
    return { items: [], nextCursor: null, hasMore: false };
  });
  await store.load();
  assert.equal(store.getSnapshot().error, true);
  assert.equal(store.getSnapshot().loaded, false);
  await store.load(); await store.load();
  assert.deepEqual(cursors, [null, null]);
  assert.equal(store.getSnapshot().loaded, true);
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(store.getSnapshot().hasMore, false);
});

test('native hook cancels offscreen work, resumes interrupted paging and blocks automatic error retries', () => {
  let focus, cancels = 0, requests = 0;
  const refs = [{ current: false }, { current: false }];
  const snapshot = { loaded: true, loading: true, error: false };
  const store = { getSnapshot: () => snapshot, getServerSnapshot: () => snapshot, subscribe() {},
    load() { requests++; }, cancel() { cancels++; snapshot.loading = false; } };
  const { useMovieSection } = load('src/hooks/useMovieSection.ts', {
    react: { useCallback: fn => fn, useRef: () => refs.shift(), useSyncExternalStore: (_subscribe, get) => get() },
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/src/utils/movie-section-pager': { getMovieSectionPager: () => store },
  });
  const hook = useMovieSection('dramaMovies');
  const blur = focus();
  assert.equal(requests, 0); // Returning to loaded data does not fetch everything again.
  blur();
  hook.loadNext(); assert.equal(requests, 0); assert.equal(cancels, 1);
  focus(); assert.equal(requests, 1); // Interrupted next page resumes on focus.
  snapshot.error = true;
  hook.loadNext(); assert.equal(requests, 1);
  hook.retry(); assert.equal(requests, 2);
});
