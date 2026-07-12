import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const review = fs.readFileSync(new URL('../stock-adjustment-review.js', import.meta.url), 'utf8');
const movements = fs.readFileSync(new URL('../inventory-movements-page.js', import.meta.url), 'utf8');
const reviewHtml = fs.readFileSync(new URL('../stock-adjustment-review.html', import.meta.url), 'utf8');
const movementsHtml = fs.readFileSync(new URL('../inventory-movements.html', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../stock-adjustment.css', import.meta.url), 'utf8');
const enhancements = fs.readFileSync(new URL('../stock-adjustment-admin-enhancements.css', import.meta.url), 'utf8');

test('admin review page uses an explicitly injected API client', () => {
  assert.match(review, /StockAdjustmentApi\.create\(client\)/);
  assert.match(review, /stockAdjustmentApi\.pending\(\)/);
  assert.match(review, /stockAdjustmentApi\.approve/);
  assert.match(review, /stockAdjustmentApi\.reject/);
  assert.doesNotMatch(review, /StockAdjustmentApi\.(pending|approve|reject)\(/);
});

test('admin review page prevents duplicate actions and keeps readable Chinese copy', () => {
  assert.match(review, /buttonsDisabled\(true\)/);
  assert.match(review, /同意/);
  assert.match(review, /驳回/);
  assert.match(review, /加载失败：/);
  assert.doesNotMatch(review, /搴撳瓨|鍔犺浇|椹冲洖|鍚屾剰|锛\?|銆\?/);
});

test('inventory movement page uses the injected API and readable messages', () => {
  assert.match(movements, /StockAdjustmentApi\.create\(client\)/);
  assert.match(movements, /stockAdjustmentApi\.movements/);
  assert.doesNotMatch(movements, /StockAdjustmentApi\.movements/);
  assert.match(movements, /共 \$\{data\.length\} 条/);
  assert.match(movements, /查询失败：/);
  assert.match(movements, /加载失败：/);
  assert.doesNotMatch(movements, /搴撳瓨|鏌ヨ|鍔犺浇|锛\?|銆\?/);
});

test('admin stock pages use the unified desktop shell and table structure', () => {
  assert.match(reviewHtml, /class="shell admin-stock-page"/);
  assert.match(reviewHtml, /class="page-card page-header-card"/);
  assert.match(reviewHtml, /id="reviewMetrics"/);
  assert.match(movementsHtml, /class="shell admin-stock-page inventory-movements-page"/);
  assert.match(movementsHtml, /class="page-card page-header-card"/);
  assert.match(movementsHtml, /class="table-wrap movements-table-wrap"/);
  assert.match(styles, /min-width:\s*1100px/);
  assert.doesNotMatch(styles, /@media\s*\(max-width/);
});

test('review script renders grouped request cards and metrics', () => {
  assert.match(review, /review-request-card/);
  assert.match(review, /review-request-actions/);
  assert.match(review, /reviewMetrics/);
  assert.match(review, /qty-positive/);
  assert.match(review, /qty-negative/);
});

test('movement script renders quantity direction classes and empty state', () => {
  assert.match(movements, /qty-positive/);
  assert.match(movements, /qty-negative/);
  assert.match(movements, /qty-zero/);
  assert.match(movements, /暂无库存流水/);
});

test('review page loads and renders completed review history', () => {
  assert.match(reviewHtml, /id="history"/);
  assert.match(reviewHtml, /审核历史/);
  assert.match(review, /stockAdjustmentApi\.reviewHistory\(100\)/);
  assert.match(review, /review-history-card/);
  assert.match(review, /已通过/);
  assert.match(review, /已驳回/);
  assert.match(review, /驳回理由/);
  assert.match(enhancements, /\.review-history-card/);
  assert.match(enhancements, /\.status-approved/);
  assert.match(enhancements, /\.status-rejected/);
});

test('movement page uses only all history and a single date picker with automatic loading', () => {
  for (const id of ['range_all', 'movementDate', 'start', 'end']) {
    assert.match(movementsHtml, new RegExp(`id="${id}"`));
  }
  for (const id of ['range_today', 'range_yesterday', 'range_7d', 'range_month', 'customRangeText', 'dateRangePanel', 'query']) {
    assert.doesNotMatch(movementsHtml, new RegExp(`id="${id}"`));
  }
  assert.match(movements, /function setRange\(/);
  assert.match(movements, /\$\('movementDate'\)\.onchange/);
  assert.match(movements, /\$\('employee'\)\.onchange = query/);
  assert.match(movements, /\$\('type'\)\.onchange = query/);
  assert.match(styles, /\.inventory-movements-page/);
});

test('review history shows employee names and spec flavor without product names', () => {
  const historyStart = review.indexOf('function renderHistoryItem');
  const historyEnd = review.indexOf('function renderHistory(rows)', historyStart);
  const historyBody = review.slice(historyStart, historyEnd);
  assert.match(historyBody, /employeeName\(request\.employee_code\)/);
  assert.match(historyBody, /employeeName\(request\.reviewer_code\)/);
  assert.match(historyBody, /StockAdjustmentCore\.formatSpecFlavor\(item\)/);
  assert.doesNotMatch(historyBody, /item\.product_name/);
});
