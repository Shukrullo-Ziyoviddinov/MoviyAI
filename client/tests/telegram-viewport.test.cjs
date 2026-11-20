const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/telegram/telegram-viewport.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForTest });
const { telegramViewportLayout } = exportsForTest;

test('bottom navigation fits the real Mini App viewport instead of the larger CSS screen', () => {
  const layout = telegramViewportLayout({ viewportStableHeight: 680, viewportHeight: 720, safeAreaInset: { bottom: 24 }, contentSafeAreaInset: { bottom: 12 } }, 840);
  assert.equal(layout.height, 680);
  assert.equal(layout.bottom, 36);
  const navBottom = layout.height - layout.bottom - 10;
  assert.ok(navBottom <= 680 - 36);
  assert.ok(navBottom - 60 >= 0);
});
test('older Telegram clients fall back to the current visible viewport or window height', () => {
  assert.equal(telegramViewportLayout({ viewportHeight: 640 }, 840).height, 640);
  assert.equal(telegramViewportLayout({}, 720).height, 720);
});
test('invalid viewport numbers and negative insets cannot move the navigation below the visible screen', () => {
  const layout = telegramViewportLayout({ viewportStableHeight: NaN, viewportHeight: -1,
    safeAreaInset: { bottom: -20 }, contentSafeAreaInset: { bottom: Infinity } }, 700);
  assert.equal(layout.height, 700); assert.equal(layout.bottom, 0);
});
