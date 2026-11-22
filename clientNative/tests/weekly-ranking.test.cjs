const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
test('weekly and lifetime requests refresh independently, preserve results on failure and do not reload regular movies', async () => {
  let state, total = deferred(), weekly = deferred(), totalCalls = 0, weeklyCalls = 0;
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/stores/useMoviesStore.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mocks = {
    zustand: { create(init) { state = init(patch => { state = { ...state, ...patch }; }, () => state); return { getState: () => state }; } },
    '@/src/api/movies': {
      fetchMovies: async () => [{ id: 1 }],
      fetchTopSearchedMovies: () => { totalCalls++; return total.promise; },
      fetchWeeklyTopSearchedMovies: () => { weeklyCalls++; return weekly.promise; },
    },
    '@/src/api/movie-sections': { fetchHomeSections: async () => [{ categoryName: 'actionMovies', movies: [{ id: 1 }] }] },
  };
  new Function('require', 'exports', 'module', source)(name => mocks[name] ?? require(name), module.exports, module);
  await state.loadMovies();
  const first = state.loadTopSearched();
  await state.loadTopSearched();
  assert.equal(totalCalls, 1); assert.equal(weeklyCalls, 1);
  weekly.resolve([{ id: 2 }]); await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.weeklySearched[0].id, 2);
  assert.deepEqual(state.topSearched, []);
  total.resolve([{ id: 3 }]); await first;
  assert.equal(state.topSearched[0].id, 3); assert.equal(state.topLoading, false);
  total = deferred(); weekly = deferred();
  const second = state.loadTopSearched();
  weekly.reject(Error('weekly unavailable')); total.resolve([{ id: 4 }]); await second;
  assert.equal(state.weeklySearched[0].id, 2); assert.equal(state.topSearched[0].id, 4);
  assert.deepEqual(state.movies, [{ id: 1 }]); assert.equal(state.topLoading, false);
});
