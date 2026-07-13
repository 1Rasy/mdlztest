import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const review = fs.readFileSync(new URL('../stock-adjustment-review.js', import.meta.url), 'utf8');
const movements = fs.readFileSync(new URL('../inventory-movements-page.js', import.meta.url), 'utf8');
const reviewHtml = fs.readFileSync(new URL('../stock-adjustment-review.html', import.meta.url), 'utf8');
const movementsHtml = fs.readFileSync(new URL('../inventory-movements.html', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../stock-adjustment.css', import.meta.url), 'utf8');
const enhancements = fs.readFileSync(new URL('../stock-adjustment-admin-enhancements.css', import.meta.url), 'utf8');
const stockSummary = fs.readFileSync(new URL('../stock_summary.html', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('inventory management keeps all inventory tools together without zero-stock toggles', () => {
  assert.match(stockSummary, /id="inventoryOverviewPanel"/);
  assert.match(stockSummary, /id="inventoryReviewPanel"/);
  assert.match(stockSummary, /id="inventoryMovementsPanel"/);
  assert.match(stockSummary, /src="stock-adjustment-review"/);
  assert.match(stockSummary, /src="inventory-movements"/);
  assert.match(stockSummary, /function switchInventoryPanel\(/);
  assert.doesNotMatch(stockSummary, /onlyNonZero/);
  assert.doesNotMatch(stockSummary, /toggleNonZero/);
  assert.doesNotMatch(stockSummary, /只看非零库存/);
  assert.doesNotMatch(stockSummary, /显示零库存行/);
});

test('dashboard inventory management shows the pending review count as a notification badge', () => {
  assert.match(dashboard, /id="inventoryManagementCard"/);
  assert.match(dashboard, /id="pendingStockAdjustmentBadge"/);
  assert.match(dashboard, /get_pending_stock_adjustment_requests/);
  assert.match(dashboard, /function loadPendingStockAdjustmentBadge\(/);
  assert.match(dashboard, /notification-badge/);
});

test('dashboard export sends the selected date range to one backend query before creating Excel', () => {
  assert.match(dashboard, /async function loadDashboardExportRows\(\)/);
  assert.match(dashboard, /client\.rpc\('get_dashboard_export_order_items'/);
  assert.match(dashboard, /p_start_at:start\?start\.toISOString\(\):null/);
  assert.match(dashboard, /p_end_at:end\?end\.toISOString\(\):null/);
  assert.match(dashboard, /sourceRows=await loadDashboardExportRows\(\)/);
  const exportStart = dashboard.indexOf('async function exportOrderExcel()');
  const exportEnd = dashboard.indexOf('async function loadDashboard()', exportStart);
  const exportBody = dashboard.slice(exportStart, exportEnd);
  assert.doesNotMatch(exportBody, /getFilteredOrders\(\)/);
  assert.doesNotMatch(dashboard, /loadOrdersForExport/);
  assert.doesNotMatch(dashboard, /loadOrderItemsForExport/);
});

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

test('movement page uses the dashboard date-range picker with automatic loading', () => {
  for (const id of ['range_all', 'customRangeText', 'dateRangePanel', 'start', 'end']) {
    assert.match(movementsHtml, new RegExp(`id="${id}"`));
  }
  for (const id of ['range_today', 'range_yesterday', 'range_7d', 'range_month', 'movementDate', 'query']) {
    assert.doesNotMatch(movementsHtml, new RegExp(`id="${id}"`));
  }
  assert.match(movements, /function setRange\(/);
  assert.match(movements, /function openDateRangePicker\(/);
  assert.match(movements, /function renderDateRangePanel\(/);
  assert.match(movements, /function renderMonth\(/);
  assert.match(movements, /function pickRangeDate\(/);
  assert.doesNotMatch(movements, /date-range-open/);
  assert.match(movements, /\$\('employee'\)\.onchange = query/);
  assert.match(movements, /\$\('type'\)\.onchange = query/);
  assert.match(styles, /\.inventory-movements-page/);
  assert.match(enhancements, /\.inventory-movements-page \.date-range-panel/);
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
