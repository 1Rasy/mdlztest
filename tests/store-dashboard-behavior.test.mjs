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

assert.ok(storeApp.includes('整=扣 ${packSize(p)}${unitOf(p)}'), 'order product hint should keep whole-unit deduction info');
assert.ok(!storeApp.includes('散=扣 1'), 'order product hint should remove loose-unit explanation');

assert.ok(storeApp.includes('function syncSpecFlavorPrice'), 'order price changes should sync same brand/spec flavor prices');
assert.ok(storeApp.includes("syncSpecFlavorPrice(id,key,Number(value)||0)"), 'changePrice should call price sync before recalculating totals');
assert.ok(storeApp.includes('target.brand===source.brand&&target.spec===source.spec'), 'price sync should be scoped to same brand and spec');

assert.ok(dashboard.includes('function renderTrendLine'), 'dashboard should render trend as a line chart helper');
assert.ok(dashboard.includes('const g=new Map();orders.forEach'), 'dashboard trend should keep existing date aggregation logic');
assert.ok(dashboard.includes('<polyline'), 'dashboard trend should use an SVG polyline');
assert.ok(!dashboard.includes('background:var(--primary);border-radius:8px 8px 2px 2px'), 'dashboard trend should no longer render bar columns');