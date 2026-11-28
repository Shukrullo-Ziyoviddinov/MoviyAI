const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
function sheet(mobile = true) {
  let pan, closed = 0, stopped = 0; const animations = [], cleanups = [];
  class Value { constructor(value) { this.value = value; } stopAnimation(cb) { cb?.(this.value); } setValue(value) { this.value = value; } }
  const mocks = {
    react: { useRef: current => ({ current }), useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => cleanups.push(fn()) },
    'react-native': { Animated: { Value, timing(value, options) { return { start(done) { animations.push({ options, finish() { value.value = options.toValue; done({ finished: true }); } }); } }; } }, Easing: { out: fn => fn, cubic() {} }, PanResponder: { create(config) { pan = config; return { panHandlers: {} }; } } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/search/useSearchSheetMotion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)(name => mocks[name], module, module.exports);
  const motion = module.exports.useSearchSheetMotion(mobile, 500, () => closed++, () => stopped++);
  motion.onShow(); animations.pop().finish();
  return { pan, motion, animations, cleanups, closed: () => closed, stopped: () => stopped };
}
test('search sheet follows the finger and only unmounts after closing animation', () => {
  const h = sheet(); h.pan.onPanResponderGrant(); h.pan.onPanResponderMove({}, { dy: 120 });
  assert.equal(h.motion.progress.value, 0.76);
  h.pan.onPanResponderRelease({}, { dy: 120, vy: 0 });
  assert.equal(h.stopped(), 1); assert.equal(h.closed(), 0);
  assert.equal(h.animations.at(-1).options.duration, 240);
  h.animations.pop().finish(); assert.equal(h.closed(), 1);
  assert.equal(h.pan.onStartShouldSetPanResponder(), false);
});
test('a tap, tiny jitter or cancelled drag returns to open without dismissing', () => {
  for (const dy of [0, 2, 30]) {
    const h = sheet(); h.pan.onPanResponderGrant(); h.pan.onPanResponderRelease({}, { dy, vy: dy < 8 ? 3 : 0 });
    assert.equal(h.stopped(), 0); assert.equal(h.animations.at(-1).options.toValue, 1);
    h.pan.onPanResponderGrant(); h.pan.onPanResponderTerminate();
    assert.equal(h.animations.at(-1).options.toValue, 1);
  }
});
test('desktop ignores drag, duplicate close is ignored and unmount invalidates animation callback', () => {
  const h = sheet(false); assert.equal(h.pan.onStartShouldSetPanResponder(), false);
  h.motion.close(); h.motion.close(); assert.equal(h.stopped(), 1);
  h.cleanups.forEach(fn => fn?.()); h.animations.pop().finish(); assert.equal(h.closed(), 0);
});
