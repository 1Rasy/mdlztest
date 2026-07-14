import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('stock_summary.html', 'utf8');

assert.match(html, /openImportFile\(\)/, '库存页应有导入库存按钮');
assert.match(html, /id="stockImportFile"/, '应有隐藏 Excel 文件输入框');
assert.match(html, /accept="\.xlsx,\.xls"/, '文件输入框应限制 Excel 文件');
assert.match(html, /A列员工编号，B列条码，C列库存散数/, '页面应说明导入模板格式');
assert.match(html, /2026-07-01 开单前初始库存/, '页面应说明7月1日初始库存口径');
assert.match(html, /parseImportQty/, '应解析 C 列库存散数');
assert.match(html, /Number\.isInteger\(qtyValue\)/, '库存散数应按整数校验');
assert.match(html, /qty<0/, '导入逻辑应允许并统计负数库存');
assert.match(html, /client\.rpc\('import_van_stock_baseline'/, '库存导入应调用基准库存RPC');
assert.match(html, /INVENTORY_BASELINE_ID = '2026-07-01-opening'/, '应固定7月1日初始库存批次');
assert.match(html, /INVENTORY_CUTOFF = '2026-07-01T00:00:00\+08:00'/, '应使用中国时区7月1日库存起算时间');
assert.doesNotMatch(html, /from\('van_stocks'\)\.upsert/, '页面不应再绕过订单扣减逻辑直接覆盖库存');
assert.match(html, /fetchExistingValues\('employees','employee_code'/, '导入前应校验员工编号存在');
assert.match(html, /fetchExistingValues\('products','barcode'/, '导入前应校验商品条码存在');

console.log('stock import static checks ok');
