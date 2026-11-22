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
function pager(read) {
  return load('src/components/recommendations/movie-section-pager.ts', { '@/api/movie-sections': {} }).createMovieSectionPager('dramaMovies', read);
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('paging coalesces concurrent scroll events, appends unique cards and stops at the end', async () => {
  const first = deferred();
  const calls = [];
  const store = pager((_category, cursor) => { calls.push(cursor); return calls.length === 1 ? first.promise : Promise.resolve({ items: [{ id: 2 }, { id: 3 }], nextCursor: null, hasMore: false }); });
  const loading = store.load();
  await store.load();
  assert.deepEqual(calls, [null]);
  assert.equal(store.getSnapshot().loading, true);
  first.resolve({ items: [{ id: 1 }, { id: 2 }], nextCursor: 'next', hasMore: true });
  await loading;
  await store.load();
  await store.load();
  assert.deepEqual(calls, [null, 'next']);
  assert.deepEqual(store.getSnapshot().items.map(item => item.id), [1, 2, 3]);
  assert.equal(store.getSnapshot().hasMore, false);
});

test('failed next page preserves cards and cursor; retry resumes the same page', async () => {
  const cursors = [];
  const store = pager(async (_category, cursor) => {
    cursors.push(cursor);
    if (cursors.length === 1) return { items: [{ id: 1 }], nextCursor: 'second', hasMore: true };
    if (cursors.length === 2) throw Error('offline');
    return { items: [{ id: 2 }], nextCursor: null, hasMore: false };
  });
  await store.load(); await store.load();
  assert.deepEqual(store.getSnapshot().items, [{ id: 1 }]);
  assert.equal(store.getSnapshot().error, true);
  await store.load();
  assert.deepEqual(cursors, [null, 'second', 'second']);
  assert.equal(store.getSnapshot().error, false);
});

test('leaving aborts a request, late responses cannot overwrite a fresh request, scroll is retained', async () => {
  const old = deferred(), fresh = deferred();
  const signals = [];
  const store = pager((_category, _cursor, signal) => { signals.push(signal); return signals.length === 1 ? old.promise : fresh.promise; });
  const a = store.load(); store.setScrollTop(500); store.cancel();
  assert.equal(signals[0].aborted, true);
  const b = store.load();
  fresh.resolve({ items: [{ id: 2 }], nextCursor: null, hasMore: false }); await b;
  old.resolve({ items: [{ id: 1 }], nextCursor: null, hasMore: false }); await a;
  assert.deepEqual(store.getSnapshot().items, [{ id: 2 }]);
  assert.equal(store.getScrollTop(), 500);
});

test('non-advancing pagination becomes a retryable error instead of an endless request loop', async () => {
  const store = pager(async () => ({ items: [], nextCursor: 'same', hasMore: true }));
  await store.load();
  assert.equal(store.getSnapshot().error, true);
  assert.equal(store.getSnapshot().loading, false);
  assert.deepEqual(store.getSnapshot().items, []);
});

test('section grid keeps loaded cards while appending skeleton cards in two mobile columns', () => {
  const { MovieSectionGrid } = load('src/components/recommendations/MovieSectionGrid.tsx', { '@/components/home/MovieCard': { MovieCard: 'card', MovieCardSkeleton: 'skeleton' } });
  const grid = MovieSectionGrid({ items: [{ id: 1 }, { id: 2 }], loading: true, language: 'uz', savedIds: [], onToggleSave() {} });
  assert.match(grid.props.className, /grid-cols-2/);
  assert.equal(grid.props.children[0].length, 2);
  assert.equal(grid.props.children[1].length, 6);
  assert.ok(grid.props.children[0].every(card => card.props.grid));
  const finished = MovieSectionGrid({ items: [{ id: 1 }, { id: 2 }], loading: false, language: 'uz', savedIds: [], onToggleSave() {} });
  assert.equal(finished.props.children[0].length, 2);
  assert.equal(finished.props.children[1], false);
  assert.equal(finished.props['aria-busy'], false);
});

test('Home uses section endpoint rather than downloading the full movie collection', async () => {
  let sections = 0;
  const { default: HomePage } = load('src/app/home/page.tsx', {
    '@/api/banners': { fetchBanners: async () => [] },
    '@/api/movies': { fetchTopSearchedMovies: async () => [], fetchWeeklyTopSearchedMovies: async () => [] },
    '@/api/movie-sections': { fetchHomeSections: async () => { sections++; return [{ categoryName: 'dramaMovies', movies: [{ id: 1 }] }]; } },
    '@/components/home/HomeScreen': { HomeScreen: 'home' },
  });
  const content = HomePage().props.children;
  const screen = await content.type();
  assert.equal(sections, 1);
  assert.deepEqual(screen.props.movies, [{ id: 1 }]);
});

test('empty results stop loading, while an initial failure can retry without skipping the first page', async () => {
  const requests = [];
  const store = pager(async (_category, cursor) => {
    requests.push(cursor);
    if (requests.length === 1) throw Error('offline');
    return { items: [], nextCursor: null, hasMore: false };
  });
  await store.load();
  assert.equal(store.getSnapshot().error, true);
  assert.equal(store.getSnapshot().loaded, false);
  await store.load(); await store.load();
  assert.deepEqual(requests, [null, null]);
  assert.equal(store.getSnapshot().loaded, true);
  assert.equal(store.getSnapshot().hasMore, false);
  assert.equal(store.getSnapshot().loading, false);
});

test('web page distinguishes initial skeleton, empty and error states and restores the inner scroll container', () => {
  const scrollNode = { scrollTop: 0 };
  let savedScroll = 420, refIndex = 0;
  const state = { items: [], loaded: false, loading: false, error: false, hasMore: true,
    pager: { getScrollTop: () => savedScroll, setScrollTop: value => { savedScroll = value; } } };
  const { RecomendatPage } = load('src/components/recommendations/RecomendatPage.tsx', {
    react: { useEffect() {}, useLayoutEffect: fn => fn(), useState: initial => [initial, () => {}], useRef: initial => ({ current: refIndex++ === 1 ? scrollNode : initial }) },
    'next/link': 'link',
    '@/api/wishlist': {},
    '@/components/icons': { ChevronLeftIcon: 'back' },
    '@/components/auth/auth-state': { useAuth: () => ({}) },
    '@/components/language/language-state': { useLanguage: () => ({ language: 'uz' }) },
    '@/components/theme/theme-state': { useTheme: () => ({ colors: {} }) },
    '@/data/homeMovies': { categoryTitle: key => key },
    '@/i18n': { translate: (_language, key) => key },
    '@/hooks/useMovieSection': { useMovieSection: () => state },
    './MovieSectionGrid': { MovieSectionGrid: 'grid' },
  });
  function render() { refIndex = 0; return RecomendatPage({ category: 'dramaMovies' }).props.children[1]; }
  const first = render();
  assert.equal(first.props.children[0].props.loading, true);
  assert.equal(first.props.children[1], false);
  state.loaded = true; state.hasMore = false;
  const empty = render();
  assert.equal(empty.props.children[0].props.loading, false);
  assert.equal(empty.props.children[1].props.children, 'listing.empty');
  assert.equal(scrollNode.scrollTop, 420);
  empty.props.onScroll({ currentTarget: { scrollTop: 500 } });
  assert.equal(savedScroll, 500);
  state.items = [{ id: 1 }]; state.error = true;
  const failed = render();
  assert.deepEqual(failed.props.children[0].props.items, [{ id: 1 }]);
  assert.equal(failed.props.children[2].props.role, 'alert');
  assert.equal(failed.props.children[4], false);
});

test('listing API aborts a stalled request at its deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const api = load('src/api/movie-sections.ts', { './client': { apiFetch: (_path, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) } });
  const request = api.fetchMovieSection('dramaMovies', null);
  const rejected = assert.rejects(request, error => error.name === 'TimeoutError');
  t.mock.timers.tick(15000);
  await rejected;
});

test('listing deadline does not break navigation cancellation or start already canceled work', async () => {
  let calls = 0;
  const api = load('src/api/movie-sections.ts', { './client': { apiFetch: (_path, { signal }) => new Promise((_resolve, reject) => {
    calls++;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) } });
  const before = new AbortController(); before.abort();
  await assert.rejects(api.fetchMovieSection('dramaMovies', null, before.signal), error => error.name === 'AbortError');
  assert.equal(calls, 0);
  const during = new AbortController();
  const request = api.fetchMovieSection('dramaMovies', null, during.signal);
  during.abort();
  await assert.rejects(request, error => error.name === 'AbortError');
  assert.equal(calls, 1);
});

test('Home distinguishes a listing failure from an empty catalogue and can reload section previews', async () => {
  const states = [], busy = { current: false }; let index = 0, calls = 0;
  const { HomeMovies } = load('src/components/home/HomeMovies.tsx', {
    react: { useEffect() {}, useRef: () => busy, useState: initial => {
      const key = index++;
      if (!(key in states)) states[key] = initial;
      return [states[key], value => { states[key] = typeof value === 'function' ? value(states[key]) : value; }];
    } },
    '@/api/movie-sections': { fetchHomeSections: async () => { calls++; return [{ movies: [{ id: 1 }] }]; } },
    '@/api/movies': {}, '@/api/wishlist': {},
    '@/i18n': { translate: (_language, key) => key },
    '@/components/home/MovieCard': { MovieCardSkeleton: 'bone' },
    '@/components/home/MovieCategoryRow': { MovieCategoryRow: 'row' },
    '@/components/home/HomeEmptyState': { HomeEmptyState: 'empty' },
    '@/components/auth/auth-state': { useAuth: () => ({}) },
    '@/components/language/language-state': { useLanguage: () => ({ language: 'uz' }) },
    '@/components/theme/theme-state': { useTheme: () => ({ colors: {} }) },
    '@/data/homeMovies': { groupMoviesByCategory: movies => movies.length ? [{ categoryName: 'dramaMovies', movies }] : [] },
  });
  const props = { movies: [], moviesError: true };
  const render = () => { index = 0; return HomeMovies(props); };
  const failed = render();
  assert.equal(failed.props.children[2].props.role, 'alert');
  const retry = failed.props.children[2].props.children[1].props.onClick;
  retry(); retry();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  const success = render();
  assert.equal(success.props.children[2], false);
  assert.equal(success.props.children[1][0].props.movies[0].id, 1);
});
