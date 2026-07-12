import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('employee stock management mode submits requests instead of updating van_stocks', () => {
  const html = read('store_stock.html');
  const js = read('store-stock-adjustment.js') + read('stock-adjustment-api.js');
  assert.doesNotMatch(html + js, /from\(['"]van_stocks['"]\)\.upsert/);
  assert.match(html, /stock-adjustment-core\.js/);
  assert.match(html, /stock-adjustment-api\.js/);
  assert.match(html, /store-stock-adjustment\.js/);
  assert.match(js, /submit_stock_adjustment_request/);
  assert.match(js, /withdraw_stock_adjustment_request/);
  assert.match(html + js, /鎴戠殑寰呭鏍稿拰宸查┏鍥炵敵璇?);
  assert.match(html + js, /棰勮搴撳瓨/);
  assert.match(html + js, /鍝佺墝|brand/);
  assert.match(html + js, /瑙勬牸|spec/);
  assert.match(html + js, /鎼滅储/);
  assert.match(html + js, /makeQtyOptions\(100,row\.qty\)/);
  assert.doesNotMatch(html + js, /type="number"/);
});

test('employee home has no separate stock adjustment entry', () => {
  const entry = read('store.html');
  assert.doesNotMatch(entry, /搴撳瓨璋冩暣鐢宠|store-adjustment-entry/);
});

test('request lists keep only pending and rejected items in the default queue', () => {
  const js = read('store-stock-adjustment.js');
  assert.match(js, /pending_review','rejected/);
  assert.doesNotMatch(js, /active=data\.filter\(x=>\['pending_review','rejected','draft','withdrawn'\]/);
  assert.match(js, /withdrawn.*history|history.*withdrawn/s);
});

test('admin pages expose approval and filtered xlsx export', () => {
  const review = read('stock-adjustment-review.html') + read('stock-adjustment-review.js') + read('stock-adjustment-api.js');
  const movements = read('inventory-movements.html') + read('inventory-movements-page.js') + read('stock-adjustment-api.js');
  assert.match(review, /approve_stock_adjustment_request/);
  assert.match(review, /reject_stock_adjustment_request/);
  assert.match(review, /椹冲洖鐞嗙敱/);
  assert.match(review, /鍟嗗搧鍚嶇О|product_name/);
  assert.match(review, /瑙勬牸|spec/);
  assert.match(review, /澶囨敞|remark/);
  assert.match(movements, /get_inventory_movement_details/);
  assert.match(movements, /xlsx@0\.18\.5/);
  assert.match(movements, /寮€濮嬫棩鏈?);
  assert.match(movements, /缁撴潫鏃ユ湡/);
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

