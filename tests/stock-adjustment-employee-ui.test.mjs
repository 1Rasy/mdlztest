import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../store-stock-adjustment.js', import.meta.url), 'utf8');
const popupSource = fs.readFileSync(new URL('../store-qty-popup.js', import.meta.url), 'utf8');

test('employee adjustment page injects its own Supabase client into the shared API', () => {
  assert.match(source, /StockAdjustmentApi\.create\(client\)/);
  assert.doesNotMatch(source, /StockAdjustmentApi\.(save|submit|withdraw|mine)\(/);
});

test('direction is selected with direct buttons and not a select box', () => {
  assert.match(source, /directionButton\(product\.id, 'plus', '增加'/);
  assert.match(source, /directionButton\(product\.id, 'minus', '减少'/);
  assert.doesNotMatch(source, /stock-dir-select/);
  assert.doesNotMatch(source, /<select[^>]+direction/);
});

test('loose quantity reuses the order page picker controls', () => {
  assert.match(source, /class="sell-line"/);
  assert.match(source, /class="sell-tag"[^>]*>散<\/span>/);
  assert.match(source, /class="ios-picker"/);
  assert.match(source, /makeQtyOptions\(100,row\.qty\)/);
  assert.match(source, /class="sell-unit"/);
  assert.doesNotMatch(source, /type="number"/);
  assert.doesNotMatch(source, /箱数|盒数|wholeQty|caseQty|boxQty/);
});

test('adjustment mode hides the page-level back button so only one return control remains', () => {
  assert.match(source, /function setBaseBackVisible/);
  assert.match(source, /setBaseBackVisible\(false\)/);
  assert.match(source, /setBaseBackVisible\(true\)/);
  assert.match(source, /返回库存查看/);
});

test('stock adjustment quantity is handled by the same 5x5 popup used by order entry', () => {
  assert.match(popupSource, /QUICK_NUMBERS = Array\.from\(\{ length: 25 \}/);
  assert.match(popupSource, /qty-popup-grid-5/);
  assert.match(popupSource, /parseStockAdjustmentSelect/);
  assert.match(popupSource, /stockAdjustmentChange/);
  assert.match(popupSource, /STATE\.handler === 'stockAdjustment'/);
});

test('single product changes update only the row and summary', () => {
  const start = source.indexOf('function setDraft');
  const end = source.indexOf('window.stockAdjustmentChange', start);
  const setDraftBody = source.slice(start, end);
  assert.ok(start >= 0 && end > start, 'setDraft should exist');
  assert.match(setDraftBody, /updateAdjustmentRow\(key\)/);
  assert.match(setDraftBody, /updateAdjustmentSummary\(\)/);
  assert.doesNotMatch(setDraftBody, /renderStockAdjustmentMode/);
  assert.doesNotMatch(setDraftBody, /\.mine\(/);
});

test('brand and spec switches rerender only the product area', () => {
  const brandStart = source.indexOf('window.selectBrand = function');
  const specStart = source.indexOf('window.selectSpec = function', brandStart);
  const rowsStart = source.indexOf('function rows', specStart);
  const brandBody = source.slice(brandStart, specStart);
  const specBody = source.slice(specStart, rowsStart);
  assert.match(brandBody, /renderAdjustmentProductArea\(\)/);
  assert.match(specBody, /renderAdjustmentProductArea\(\)/);
  assert.doesNotMatch(brandBody, /renderStockAdjustmentMode/);
  assert.doesNotMatch(specBody, /renderStockAdjustmentMode/);
});

test('editing a negative request restores decrease and absolute quantity', () => {
  assert.match(source, /Number\(item\.adjustment_qty\) < 0 \? 'minus' : 'plus'/);
  assert.match(source, /Math\.abs\(Number\(item\.adjustment_qty\)\)/);
});

test('employee submission never writes van_stocks directly', () => {
  assert.doesNotMatch(source, /from\(['"]van_stocks['"]\)/);
  assert.match(source, /stockAdjustmentApi\.save/);
  assert.match(source, /stockAdjustmentApi\.submit/);
});
