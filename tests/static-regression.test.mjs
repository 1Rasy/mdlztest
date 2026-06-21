import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readHtml(file) {
  return readFileSync(join(root, file), 'utf8');
}

function assertIncludes(content, expected, message) {
  assert.ok(content.includes(expected), message || `Expected to find ${expected}`);
}

assert.ok(existsSync(join(root, 'dashboard.html')), 'dashboard.html should exist');

const dashboard = readHtml('dashboard.html');
assertIncludes(dashboard, "location.href='store_import.html'", 'dashboard links to store import');
assertIncludes(dashboard, "location.href='stock_import.html'", 'dashboard links to stock import');
assertIncludes(dashboard, "location.href='products.html'", 'dashboard links to products table');
assertIncludes(dashboard, "location.href='employees.html'", 'dashboard links to employees table');
assertIncludes(dashboard, ".from('sales_orders')", 'dashboard loads sell-in orders');
assertIncludes(dashboard, ".from('employees')", 'dashboard loads employee names');
assertIncludes(dashboard, 'employeeRankRows', 'dashboard renders employee ranking');
assertIncludes(dashboard, 'recentOrderRows', 'dashboard renders recent sell-in orders');

const employees = readHtml('employees.html');
assert.ok(!employees.includes('sortModeBtn'), 'employees page should not have a sort button');
assert.ok(!employees.includes('toggleSortMode'), 'employees page should not implement sorting');

const headerMatch = employees.match(/<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>/);
assert.ok(headerMatch, 'employees table should have a header row');
const headerText = headerMatch[1].replace(/\s+/g, ' ');
const codeIndex = headerText.indexOf('员工工号');
const nameIndex = headerText.indexOf('员工姓名');
const actionIndex = headerText.indexOf('操作');
const activeIndex = headerText.indexOf('启用');
assert.ok(codeIndex >= 0, 'employee code column should exist');
assert.ok(nameIndex > codeIndex, 'employee name should be after employee code');
assert.ok(actionIndex > nameIndex, 'actions should be after employee name');
assert.ok(activeIndex > actionIndex, 'active column should be the rightmost employee column');

const newRowMatch = employees.match(/function renderNewEmployeeRow\(\)[\s\S]*?return `([\s\S]*?)`;/);
assert.ok(newRowMatch, 'new employee row renderer should exist');
const newRow = newRowMatch[1];
assert.ok(newRow.indexOf('new_employee_code') < newRow.indexOf('new_name'), 'new row code should be before name');
assert.ok(newRow.indexOf('new_name') < newRow.indexOf('inline-actions'), 'new row actions should be after name');
assert.ok(newRow.indexOf('inline-actions') < newRow.indexOf('new_is_active'), 'new row active checkbox should be rightmost');

const renderTableMatch = employees.match(/function renderTable\(\)[\s\S]*?const rows = filtered\.map\(e => `([\s\S]*?)`\)\.join/);
assert.ok(renderTableMatch, 'employee table row renderer should exist');
const dataRow = renderTableMatch[1];
assert.ok(dataRow.indexOf("renderInput(e,'employee_code')") < dataRow.indexOf("renderInput(e,'name')"), 'data row code should be before name');
assert.ok(dataRow.indexOf("renderInput(e,'name')") < dataRow.indexOf('saveRow'), 'data row actions should be after name');
assert.ok(dataRow.indexOf('saveRow') < dataRow.indexOf('data-field="is_active"'), 'data row active checkbox should be rightmost');

const stockImport = readHtml('stock_import.html');
const storeImport = readHtml('store_import.html');
for (const [name, html] of [['stock_import.html', stockImport], ['store_import.html', storeImport]]) {
  assertIncludes(html, '--primary:#4A154B', `${name} should use the stock import primary color`);
  assertIncludes(html, 'class="container"', `${name} should use the shared import container`);
  assertIncludes(html, 'class="card"', `${name} should use the shared import card`);
  assertIncludes(html, 'class="upload-box"', `${name} should use the shared upload box`);
  assertIncludes(html, 'class="btn-submit"', `${name} should use the shared submit button`);
  assert.ok(!html.includes('数据清洗'), `${name} should not mention data cleaning`);
  assert.ok(!html.includes('差集'), `${name} should not mention set-difference import`);
  assert.ok(!html.includes('覆盖'), `${name} should not mention overwrite behavior in visible copy`);
}
assertIncludes(stockImport, 'fixed-map', 'stock import should keep its fixed-column rule block');
assertIncludes(stockImport, 'A单号', 'stock import should keep A-P import rules');
assertIncludes(stockImport, 'P应收款', 'stock import should keep A-P import rules');
assert.ok(!storeImport.includes('fixed-map'), 'store import should not show stock fixed-column rules');
