import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('keeps the application entry inside the stock management page', () => {
  const home = read('store.html');
  const stock = read('store_stock.html');
  const app = read('store-stock-adjustment.js');
  assert.doesNotMatch(home, /库存调整申请|store-adjustment-entry/);
  assert.match(stock, /store-style\.css/);
  assert.match(stock, /store-stock-adjustment\.js/);
  assert.match(app, /申请修改库存/);
  assert.match(app, /openStockAdjustmentMode/);
});

test('employee adjustment mode uses only signed loose-piece quantities and RPCs', () => {
  const app = read('store-stock-adjustment.js');
  assert.doesNotMatch(app, /箱数|盒数|case_|box_/);
  assert.match(app, /step="1"/);
  assert.match(app, /Number\.isSafeInteger/);
  assert.match(app, /qty>=0/);
  assert.match(app, /adjustment_qty/);
  assert.match(app, /direction === 'minus' \? -row\.qty : row\.qty/);
  assert.doesNotMatch(app, /from\(['"]van_stocks['"]\)\.upsert/);
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

