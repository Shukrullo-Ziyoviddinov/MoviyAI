const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('a failed avatar falls back to an initial and a changed photo URL is retried', () => {
  let failed = null;
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/common/UserAvatar.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { useState: () => [failed, value => { failed = value; }] };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    return { useTheme: () => ({ colors: {} }) };
  } });
  const render = picture => exports.UserAvatar({ name: 'Ali', picture }).props.children;
  const first = render('https://example.org/old.jpg');
  assert.equal(first.type, 'img'); first.props.onError();
  assert.equal(render('https://example.org/old.jpg').props.children, 'A');
  const changed = render('https://example.org/new.jpg');
  assert.equal(changed.type, 'img'); assert.equal(changed.props.src, 'https://example.org/new.jpg');
  assert.equal(changed.props.referrerPolicy, 'no-referrer');
});
