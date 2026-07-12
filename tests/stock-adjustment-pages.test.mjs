import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('employee stock page submits requests instead of updating van_stocks', () => {
  const html = read('stock.html');
  const js = read('stock-adjustment-page.js');
  assert.doesNotMatch(html + js, /from\(['"]van_stocks['"]\)\.upsert/);
  assert.match(html, /stock-adjustment-core\.js/);
  assert.match(html, /stock-adjustment-api\.js/);
  assert.match(html, /stock-adjustment-page\.js/);
  assert.match(js, /submit_stock_adjustment_request/);
  assert.match(js, /withdraw_stock_adjustment_request/);
  assert.match(html + js, /我的申请/);
  assert.match(html + js, /预计库存/);
});

test('admin pages expose approval and filtered xlsx export', () => {
  const review = read('stock-adjustment-review.html') + read('stock-adjustment-review.js');
  const movements = read('inventory-movements.html') + read('inventory-movements-page.js');
  assert.match(review, /approve_stock_adjustment_request/);
  assert.match(review, /reject_stock_adjustment_request/);
  assert.match(review, /驳回理由/);
  assert.match(movements, /get_inventory_movement_details/);
  assert.match(movements, /xlsx@0\.18\.5/);
  assert.match(movements, /开始日期/);
  assert.match(movements, /结束日期/);
});

test('dashboard and clean routes link both new admin pages', () => {
  const dashboard = read('dashboard.html');
  const redirects = read('_redirects');
  assert.match(dashboard, /stock-adjustment-review/);
  assert.match(dashboard, /inventory-movements/);
  assert.match(redirects, /\/stock-adjustment-review/);
  assert.match(redirects, /\/inventory-movements/);
});

test('database regression script covers transactional scenarios', () => {
  const sql = read('tests/stock-adjustment-database-regression.sql').toLowerCase();
  for (const marker of ['zero quantity', 'single pending', 'withdraw no stock', 'reject preserves stock', 'latest stock', 'negative stock', 'duplicate approval', 'movement rollback']) {
    assert.match(sql, new RegExp(marker));
  }
  assert.match(sql, /begin;/);
  assert.match(sql, /rollback;/);
});

