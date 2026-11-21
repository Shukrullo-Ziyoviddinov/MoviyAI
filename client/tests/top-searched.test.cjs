const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('top-search row passes ranks 1–10 in server order; ordinary category cards have no rank', () => {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/components/home/MovieCategoryRow.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    '@/components/theme/theme-state': { useTheme: () => ({ colors: {} }) },
    '@/data/homeMovies': { categoryTitle: key => key },
    '@/components/common/HorizontalScroll': { HorizontalScroll: 'strip' },
    '@/components/home/MovieCard': { MovieCard: 'card' },
  };
  new Function('require', 'exports', 'module', code)(name => mocks[name] ?? require(name), module.exports, module);
  const movies = Array.from({ length: 10 }, (_, index) => ({ id: 100 - index }));
  const props = { categoryName: 'topSearchedMovies', movies, language: 'uz', savedIds: [], onToggleSave() {} };
  const top = module.exports.MovieCategoryRow({ ...props, ranked: true });
  const cards = top.props.children[1].props.children;
  assert.deepEqual(cards.map(card => card.props.rank), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(cards.map(card => card.props.movie.id), movies.map(movie => movie.id));
  const normal = module.exports.MovieCategoryRow({ ...props, categoryName: 'actionMovies' });
  assert.ok(normal.props.children[1].props.children.every(card => card.props.rank === undefined));
});
