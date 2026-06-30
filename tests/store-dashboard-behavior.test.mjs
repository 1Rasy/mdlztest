import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storeApp = readFileSync(join(root, 'store-app.js'), 'utf8');
const dashboard = readFileSync(join(root, 'dashboard.html'), 'utf8');

assert.ok(storeApp.includes("p.set('emp',currentEmployee.code)"), 'split store URLs should keep employee code');
assert.ok(!storeApp.includes("p.set('name'"), 'split store URLs should not append employee name');
const employeeQueryBody = storeApp.match(/function employeeQueryString\(\)\{([\s\S]*?)\}function storePageUrl/)?.[1] || '';
assert.ok(!employeeQueryBody.includes('currentEmployee.name'), 'split store URL builder should not depend on employee name');
assert.ok(storeApp.includes("target='emp='+encodeURIComponent(currentEmployee.code)"), 'store pages should normalize the URL to emp only');

assert.ok(storeApp.includes("<div class='pack-hint'>") && storeApp.includes('${packSize(p)}${unitOf(p)}'), 'order product hint should keep whole-unit deduction info');
assert.ok(!storeApp.includes('?=?'), 'order product hint should not contain mojibake');
assert.ok(storeApp.includes('flavor-badge'), 'order flavor name should use a stronger badge style');

assert.ok(storeApp.includes('function syncSpecFlavorPrice'), 'order price changes should sync same brand/spec flavor prices');
assert.ok(storeApp.includes('const price=Number(value)||0;syncSpecFlavorPrice(id,key,price);syncSpecFlavorPriceInputs(id,key,price);calculateLiveOrderAmounts()'), 'changePrice should sync data and visible inputs before recalculating totals');
assert.ok(storeApp.includes('target.brand===source.brand&&target.spec===source.spec'), 'price sync should be scoped to same brand and spec');

assert.ok(storeApp.includes('order-date-row'), 'order date controls should use a dedicated spaced row');
assert.ok(storeApp.includes('order-date-action'), 'order date edit button should have its own compact action style');
assert.ok(storeApp.includes('pack-hint'), 'order pack deduction hint should use a separated hint style');

assert.ok(dashboard.includes('function renderTrendLine'), 'dashboard should render trend as a line chart helper');
assert.ok(dashboard.includes('const g=new Map();orders.forEach'), 'dashboard trend should keep existing date aggregation logic');
assert.ok(dashboard.includes('<polyline'), 'dashboard trend should use an SVG polyline');
assert.ok(!dashboard.includes('background:var(--primary);border-radius:8px 8px 2px 2px'), 'dashboard trend should no longer render bar columns');
assert.ok(dashboard.includes('customRangeText') && dashboard.includes('dateRangePanel'), 'dashboard date filter should use one range input with a picker panel');
assert.ok(!dashboard.includes('customStartDate') && !dashboard.includes('customEndDate'), 'dashboard date filter should not expose two separate date inputs');
assert.ok(dashboard.includes('function openDateRangePicker') && dashboard.includes('function pickRangeDate'), 'dashboard should support selecting a custom date range from one picker');
assert.ok(dashboard.includes('normalizeCustomDateRange'), 'dashboard should normalize reversed custom date ranges');
assert.ok(dashboard.includes('function getExportDateLabel'), 'dashboard export filename should use active date range label');
assert.ok(dashboard.includes('XLSX.writeFile(wb,getExportFileName()'), 'dashboard export filename should include the selected date range');
assert.ok(!dashboard.includes('trend-summary'), 'dashboard trend should not show extra text summary above the line');
assert.ok(!dashboard.includes('preserveAspectRatio="none"'), 'dashboard trend SVG should avoid non-uniform scaling that distorts circles');
assert.ok(dashboard.includes('preserveAspectRatio="xMidYMid meet"'), 'dashboard trend SVG should keep circles round');
