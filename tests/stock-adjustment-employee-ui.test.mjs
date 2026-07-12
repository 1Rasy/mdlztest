import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('keeps the application entry inside the stock management page', () => {
  const home = read('store.html');
  const stock = read('store_stock.html');
  const app = read('store-stock-adjustment.js');
  assert.doesNotMatch(home, /搴撳瓨璋冩暣鐢宠|store-adjustment-entry/);
  assert.match(stock, /store-style\.css/);
  assert.match(stock, /store-stock-adjustment\.js/);
  assert.match(app, /鐢宠淇敼搴撳瓨/);
  assert.match(app, /openStockAdjustmentMode/);
});

test('employee adjustment mode uses only signed loose-piece quantities and RPCs', () => {
  const app = read('store-stock-adjustment.js');
  assert.doesNotMatch(app, /绠辨暟|鐩掓暟|case_|box_/);
  assert.doesNotMatch(app, /<select class="stock-dir-select"/);
  assert.doesNotMatch(app, /type="number"/);
  assert.match(app, /澧炲姞<\/button>/);
  assert.match(app, /鍑忓皯<\/button>/);
  assert.match(app, /sell-line/);
  assert.match(app, /sell-tag/);
  assert.match(app, /makeQtyOptions\(100,row\.qty\)/);
  assert.match(app, /Number\.isSafeInteger/);
  assert.match(app, /qty>=0/);
  assert.match(app, /adjustment_qty/);
  assert.match(app, /direction === 'minus' \? -row\.qty : row\.qty/);
  assert.doesNotMatch(app, /from\(['"]van_stocks['"]\)\.upsert/);
});

test('single product changes update only local row and summary without reloading history', () => {
  const app = read('store-stock-adjustment.js');
  assert.doesNotMatch(app, /setDraft[\s\S]{0,500}renderStockAdjustmentMode\(\)/);
  assert.match(app, /updateAdjustmentRow/);
  assert.match(app, /updateAdjustmentSummary/);
});

test('editing a negative request restores the decrease direction and absolute loose quantity', () => {
  const app = read('store-stock-adjustment.js');
  assert.match(app, /direction: Number\(item\.adjustment_qty\) < 0 \? 'minus' : 'plus'/);
  assert.match(app, /qty: Math\.abs\(Number\(item\.adjustment_qty\)\)/);
});

test('legacy stock page only redirects to the unified stock management mode', () => {
  const legacy = read('stock.html');
  assert.match(legacy, /store_stock\.html/);
  assert.doesNotMatch(legacy, /stock-adjustment\.css/);
});

