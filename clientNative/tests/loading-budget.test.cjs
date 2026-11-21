const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', 'module', code)(name => mocks[name] ?? require(name), module.exports, module);
  return module.exports;
}

test('many skeletons share a single animation and releasing one cannot stop the others', () => {
  const { createPulseSubscriptions } = load('components/common/SkeletonPulse.tsx', { 'react-native-reanimated': {}, 'expo-router': {} });
  let starts = 0, stops = 0;
  const clock = createPulseSubscriptions(() => starts++, () => stops++);
  const releases = Array.from({ length: 40 }, () => clock.subscribe());
  assert.equal(starts, 1);
  releases[0](); releases[0]();
  assert.equal(stops, 0);
  releases.slice(1).forEach(release => release());
  assert.equal(stops, 1);
  const next = clock.subscribe();
  assert.equal(starts, 2);
  clock.dispose();
  assert.equal(stops, 2);
  next(); // A stale blur/unmount callback must not decrement a new subscription.
  const active = clock.subscribe();
  next();
  assert.equal(stops, 2);
  active();
  assert.equal(stops, 3);
});

test('offscreen sections wait until near the viewport and reveal only once', () => {
  const { createDeferredViewport } = load('src/utils/deferred-viewport.ts');
  const viewport = createDeferredViewport(200);
  const revealed = [];
  viewport.watch(50, () => revealed.push('visible'));
  viewport.watch(500, () => revealed.push('actors'));
  const release = viewport.watch(800, () => revealed.push('removed'));
  viewport.watch(1200, () => revealed.push('similar'));
  assert.deepEqual(revealed, ['visible']);
  viewport.update(600);
  assert.deepEqual(revealed, ['visible', 'actors']);
  release();
  viewport.update(2000); viewport.update(100); viewport.update(2000);
  assert.deepEqual(revealed, ['visible', 'actors', 'similar']);
});

test('deferred content factories do no work before their section is reached', () => {
  const values = [false, null];
  let cursor = 0, cleanup;
  const { createDeferredViewport } = load('src/utils/deferred-viewport.ts');
  const viewport = createDeferredViewport(100);
  const { DeferredSection } = load('components/common/DeferredSection.tsx', {
    react: { useState: () => { const index = cursor++; return [values[index], next => { values[index] = next; }]; }, useEffect: fn => { cleanup = fn(); } },
    'react-native': { View: 'view' },
  });
  let rendered = 0;
  const props = { viewport, minHeight: 120, children: () => { rendered++; return 'heavy-content'; } };
  const render = () => { cursor = 0; return DeferredSection(props); };
  const tree = render();
  assert.equal(rendered, 0);
  tree.props.onLayout({ nativeEvent: { layout: { y: 500 } } });
  render();
  viewport.update(400);
  assert.equal(values[0], false);
  viewport.update(600);
  assert.equal(values[0], true);
  cleanup?.();
  assert.equal(render().props.children, 'heavy-content');
  assert.equal(rendered, 1);
  cleanup?.();
});


test('bones inside a loading group create no independent animated view', () => {
  const { SkeletonLoader } = load('components/common/SkeletonLoader.tsx', {
    react: { useContext: () => true },
    './SkeletonPulse': { SkeletonGroupContext: {}, useSkeletonAnimation: () => { throw new Error('independent animation'); } },
    'react-native': { View: 'static-bone', StyleSheet: { create: value => value } },
    'react-native-reanimated': { __esModule: true, default: { View: 'animated-bone' } },
    '@/src/stores/useThemeStore': { useTheme: () => ({ isDark: true }) },
  });
  const node = SkeletonLoader({ width: 150, height: 200 });
  const bone = node.type(node.props);
  assert.equal(bone.type, 'static-bone');
});
