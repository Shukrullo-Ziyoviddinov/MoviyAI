const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Exercise the actual loading effect without requiring an Android runtime.
const source = ts.createSourceFile('detail.tsx', fs.readFileSync('app/movie/[id].tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect'
      && node.arguments[0]?.getText(source).includes('fetchMovieById(movieId)')) effect = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(source);
const code = ts.transpileModule(`exports.start = ${effect.getText(source)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const movie = deferred(), comments = deferred(), similar = deferred();
  const state = {};
  const setters = ['setMovie', 'setError', 'setComments', 'setSimilarMovies'];
  const names = ['fetchMovieById', 'fetchMovieComments', 'fetchSimilarMovies', 'movieId', ...setters, 'exports'];
  const exports = {};
  new Function(...names, code)(() => movie.promise, () => comments.promise, () => similar.promise, 42,
    ...setters.map(key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }), exports);
  const cleanup = exports.start();
  return { movie, comments, similar, state, cleanup };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('movie appears while slow comments and recommendations remain pending', async () => {
  const h = harness();
  h.movie.resolve({ id: 42, commentCount: 3 });
  await tick();
  assert.equal(h.state.setMovie.id, 42);
  h.comments.reject(new Error('comments unavailable'));
  h.similar.reject(new Error('recommendations unavailable'));
  await tick();
  assert.equal(h.state.setMovie.id, 42);
  assert.equal(h.state.setError, null);
});

test('comments arriving first preserve their count when the main movie arrives', async () => {
  const h = harness();
  h.comments.resolve({ comments: [{ id: 'one' }], commentCount: 9 });
  await tick();
  h.movie.resolve({ id: 42, commentCount: 1 });
  await tick();
  assert.equal(h.state.setMovie.commentCount, 9);
});

test('late network responses cannot update a screen after leaving it', async () => {
  const h = harness();
  h.cleanup();
  h.movie.resolve({ id: 42 });
  h.comments.resolve({ comments: [{ id: 'one' }], commentCount: 9 });
  h.similar.resolve([{ id: 8 }]);
  await tick();
  assert.equal(h.state.setMovie, null);
  assert.deepEqual(h.state.setComments, []);
  assert.deepEqual(h.state.setSimilarMovies, []);
});
