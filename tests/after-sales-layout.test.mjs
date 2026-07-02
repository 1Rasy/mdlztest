import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, 'store-after-sales.css'), 'utf8');
const js = readFileSync(join(root, 'store-after-sales.js'), 'utf8');

assert.ok(
  css.includes('.sell-line.after-sales-line{position:relative;grid-template-columns:32px 48px 38px 34px 78px'),
  'after-sales loose row should keep the same five grid columns as the regular sell row'
);
assert.ok(!css.includes('grid-template-columns:32px 48px 32px 34px 78px auto'), 'after-sales button must not add a sixth grid column');
assert.ok(js.includes("line.insertAdjacentHTML('afterend', buildAfterSalePanel(id))"), 'after-sales controls should expand in a separate row below the loose row');
assert.ok(js.includes('\\u53ea\\u7b97\\u80fd\\u5356\\u7684'), 'after-sales panel should explain that only resellable returns count');
assert.ok(js.includes('\\u6536\\u56de\\u589e\\u52a0\\u5e93\\u5b58'), 'after-sales panel should explain that received returns increase inventory');
assert.ok(js.includes('const originalTemplateEditOrNew'), 'after-sales script should wrap edit/new order rendering');
assert.ok(js.includes('templateEditOrNew = function(orderNo=null'), 'after-sales script should stay active when editing an existing order');
assert.ok(js.includes('new MutationObserver(scheduleBind).observe(list,{childList:true,subtree:true})'), 'after-sales controls should bind after the order page is re-rendered');
