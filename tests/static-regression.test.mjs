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
assertIncludes(dashboard, "location.href='stock_summary.html'", 'dashboard links to stock summary');
assertIncludes(dashboard, '<strong>库存管理</strong>', 'dashboard labels stock summary as inventory management');
assert.ok(!dashboard.includes('<strong>总库存管理</strong>'), 'dashboard should not label stock summary with total inventory wording');
assertIncludes(dashboard, "location.href='products.html'", 'dashboard links to products table');
assertIncludes(dashboard, "location.href='employees.html'", 'dashboard links to employees table');
assertIncludes(dashboard, ".from('sales_orders')", 'dashboard loads sell-in orders');
assertIncludes(dashboard, ".from('employees')", 'dashboard loads employee names');
assertIncludes(dashboard, 'employeeRankRows', 'dashboard renders employee ranking');
assertIncludes(dashboard, 'id="employeeFilter"', 'dashboard should provide employee chip filter area');
assertIncludes(dashboard, 'class="employee-filter"', 'dashboard employee filter should use chip layout');
assertIncludes(dashboard, 'employee-chip', 'dashboard should render employee chips');
assertIncludes(dashboard, 'setEmployeeFilter', 'employee chips should switch selected employee');
assertIncludes(dashboard, 'selectedEmployeeCode', 'dashboard should store selected employee code');
assertIncludes(dashboard, 'function filterOrdersByEmployee', 'dashboard should filter orders by selected employee');
assertIncludes(dashboard, 'function buildEmployeeOptions', 'dashboard should build employee chip options');
assertIncludes(dashboard, '全部</button>', 'dashboard employee filter should include an all option');
assertIncludes(dashboard, 'function buildMetrics(orders)', 'dashboard should rebuild metrics from filtered orders');
assertIncludes(dashboard, '<div class="label">卖进门店数</div>', 'dashboard should label store metric as sell-in store count');
assertIncludes(dashboard, '<th style="width:110px;">卖进门店数</th>', 'employee ranking should label store column as sell-in store count');
assert.ok(!dashboard.includes('employeeSearch'), 'dashboard should not use employee search input');
assert.ok(!dashboard.includes('placeholder="搜索员工名字"'), 'dashboard should not use employee name search box');
assert.ok(!dashboard.includes('filterOrdersByEmployeeName'), 'dashboard should not filter by text search');
assert.ok(!dashboard.includes('recentOrderRows'), 'dashboard should not render recent orders');
assert.ok(!dashboard.includes('最近卖进单据'), 'dashboard should remove recent orders card');
assert.ok(!dashboard.includes('<div class="split">'), 'dashboard should show ranking as the default single section');
assertIncludes(dashboard, '.metric-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; }', 'dashboard should use four metric cards');
assert.ok(!dashboard.includes('动销人员'), 'dashboard should not show active seller metric');
assert.ok(!dashboard.includes('activeSellerCount'), 'dashboard should not compute active seller metric');
assert.ok(!dashboard.includes('<div class="hint">元</div>'), 'dashboard metric cards should not show small unit hints');
assert.ok(!dashboard.includes('<div class="hint">有效订单数</div>'), 'dashboard order metric should not show small hint');
assert.ok(!dashboard.includes('<div class="hint">有卖进的门店</div>'), 'dashboard store metric should not show small hint');
assert.ok(!dashboard.includes('<div class="hint">元 / 单</div>'), 'dashboard average metric should not show small hint');
assert.ok(!dashboard.includes('<div class="sub">${esc(row.employee_code)}</div>'), 'employee ranking should not show employee code subtitle');
assert.ok(!dashboard.includes('<div class="sub">${esc(order.employee_code || \'\')}</div>'), 'recent orders should not show employee code subtitle');

const employees = readHtml('employees.html');
assert.ok(!employees.includes('sortModeBtn'), 'employees page should not have a sort button');
assert.ok(!employees.includes('toggleSortMode'), 'employees page should not implement sorting');
assertIncludes(employees, ".from('dealer_employee_mappings')", 'employees page should load dealer employee mappings');
assertIncludes(employees, 'customer_code', 'employees page should read mapping customer_code');
assertIncludes(employees, 'saveMappingForEmployee', 'employees page should save mapping customer codes');
assertIncludes(employees, 'renderCustomerCodeInput', 'employees page should render editable customer codes');
assertIncludes(employees, '经销商客户编号', 'employees page should label customer_code as dealer customer code');

const headerMatch = employees.match(/<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>/);
assert.ok(headerMatch, 'employees table should have a header row');
const headerText = headerMatch[1].replace(/\s+/g, ' ');
const codeIndex = headerText.indexOf('employee-code-col');
const nameIndex = headerText.indexOf('employee-name-col');
const customerCodeIndex = headerText.indexOf('customer-code-col');
const actionIndex = headerText.indexOf('action-col');
const activeIndex = headerText.indexOf('active-col');
assert.ok(codeIndex >= 0, 'employee code column should exist');
assert.ok(nameIndex > codeIndex, 'employee name should be after employee code');
assert.ok(customerCodeIndex > nameIndex, 'dealer customer code should be after employee name');
assert.ok(actionIndex > customerCodeIndex, 'actions should be after dealer customer code');
assert.ok(activeIndex > actionIndex, 'active column should be the rightmost employee column');

const newRowMatch = employees.match(/function renderNewEmployeeRow\(\)[\s\S]*?return `([\s\S]*?)`;/);
assert.ok(newRowMatch, 'new employee row renderer should exist');
const newRow = newRowMatch[1];
assert.ok(newRow.indexOf('new_employee_code') < newRow.indexOf('new_name'), 'new row code should be before name');
assert.ok(newRow.indexOf('new_name') < newRow.indexOf('new_customer_code'), 'new row dealer customer code should be after name');
assert.ok(newRow.indexOf('new_customer_code') < newRow.indexOf('inline-actions'), 'new row actions should be after dealer customer code');
assert.ok(newRow.indexOf('inline-actions') < newRow.indexOf('new_is_active'), 'new row active checkbox should be rightmost');

const renderTableMatch = employees.match(/function renderTable\(\)[\s\S]*?const rows = filtered\.map\(e => `([\s\S]*?)`\)\.join/);
assert.ok(renderTableMatch, 'employee table row renderer should exist');
const dataRow = renderTableMatch[1];
assert.ok(dataRow.indexOf("renderInput(e,'employee_code')") < dataRow.indexOf("renderInput(e,'name')"), 'data row code should be before name');
assert.ok(dataRow.indexOf("renderInput(e,'name')") < dataRow.indexOf('renderCustomerCodeInput'), 'data row dealer customer code should be after name');
assert.ok(dataRow.indexOf('renderCustomerCodeInput') < dataRow.indexOf('saveRow'), 'data row actions should be after dealer customer code');
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
assertIncludes(stockImport, 'A单号、C制单日期、D客户编号、E客户、G条形码、H商品名称、I包装、J件、L散', 'stock import should keep fixed import rules');
assertIncludes(stockImport, '其他列会被忽略', 'stock import should say ignored columns are not written');
assert.ok(!storeImport.includes('fixed-map'), 'store import should not show stock fixed-column rules');

assert.ok(existsSync(join(root, 'stock_summary.html')), 'stock_summary.html should exist');
const stockSummary = readHtml('stock_summary.html');
assertIncludes(stockSummary, '<title>库存管理</title>', 'stock summary page title should be inventory management');
assertIncludes(stockSummary, '<h1>库存管理</h1>', 'stock summary page heading should be inventory management');
assertIncludes(stockSummary, 'onclick="exportEmployeeStocks()"', 'stock summary should expose export button');
assertIncludes(stockSummary, "['员工名字', '员工号', '商品名', '条码', '库存散数']", 'stock export should use the required headers with barcode');
assertIncludes(stockSummary, "item.product_barcode", 'stock export should include product barcode values');
assertIncludes(stockSummary, 'function exportEmployeeStocks()', 'stock summary should implement employee stock export');
assertIncludes(stockSummary, 'xlsx.full.min.js', 'stock export should load the xlsx writer');
assertIncludes(stockSummary, 'XLSX.writeFile', 'stock export should write a real xlsx file');
assertIncludes(stockSummary, '库存管理_${stamp}.xlsx', 'stock export filename should use .xlsx');
assertIncludes(stockSummary, '.detail-table { min-width:1040px; table-layout:fixed; }', 'stock detail table should use fixed layout');
assertIncludes(stockSummary, '.detail-table th, .detail-table td { vertical-align:top; line-height:1.45; padding:9px 10px; }', 'stock detail table cells should top-align with readable line height');
assertIncludes(stockSummary, '.detail-product', 'stock detail product names should use a dedicated style');
assertIncludes(stockSummary, '<td colspan="6">', 'stock summary detail row should span the simplified six-column table');
assertIncludes(stockSummary, 'hideStatus();', 'stock summary should hide the green loaded status after rendering');
assert.ok(!stockSummary.includes('有车存员工'), 'stock summary should use inventory wording instead of vehicle-stock wording');
assert.ok(!stockSummary.includes('需要重点核对'), 'stock summary should not show the negative-stock hint');
assert.ok(!stockSummary.includes('<th>主要库存</th>'), 'stock summary should not show main inventory column');
assert.ok(!stockSummary.includes('row.topItems'), 'stock summary should not compute or render main inventory text');
assert.ok(!stockSummary.includes('<div class="sub">${esc(row.employee_code)}'), 'stock summary should not show employee code below name');
assert.ok(!stockSummary.includes('application/vnd.ms-excel'), 'stock export should not use HTML-as-XLS mime type');
assert.ok(!stockSummary.includes('link.download = `库存管理_${stamp}.xls`'), 'stock export should not download fake .xls files');
assert.ok(!stockSummary.includes('复制核对清单'), 'stock summary should not show copy checklist');
assert.ok(!stockSummary.includes('toggleCopyText'), 'stock summary should remove copy checklist behavior');
assert.ok(!stockSummary.includes('copyArea'), 'stock summary should remove copy checklist textarea');
assert.ok(!stockSummary.includes('<div class="label">库存品项</div>'), 'stock summary should not show large product item metric');
assert.ok(!stockSummary.includes('<div class="label">总散数</div>'), 'stock summary should not show large total loose quantity metric');
assert.ok(!stockSummary.includes('${esc(item.product.sub)}'), 'stock detail should not show brand/spec/flavor subtitle');
