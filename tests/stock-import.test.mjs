import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('stock_summary.html', 'utf8');

assert.match(html, /当前库存只由订单计算/, '库存页应说明库存只由订单计算');
assert.match(html, /2026-07-01 00:00/, '库存页应说明7月1日起算时间');
assert.match(html, /7月1日前订单仅作历史查看/, '页面应说明旧订单只作历史查看');
assert.match(html, /经销商原始出库导入不参与库存/, '页面应说明raw导入不参与库存');
assert.match(html, /INVENTORY_CUTOFF = '2026-07-01T00:00:00\+08:00'/, '应固定中国时区7月1日起算时间');
assert.doesNotMatch(html, /openImportFile\(/, '库存汇总页不应提供初始库存导入');
assert.doesNotMatch(html, /id="stockImportFile"/, '库存汇总页不应保留库存Excel输入');
assert.doesNotMatch(html, /import_van_stock_baseline/, '库存汇总页不应调用基准库存RPC');
assert.doesNotMatch(html, /from\('van_stocks'\)\.upsert/, '页面不应直接覆盖库存');
assert.match(html, /onclick="exportEmployeeStocks\(\)"/, '库存页应保留导出功能');
assert.match(html, /client\.from\('van_stocks'\)/, '库存页应读取订单计算后的库存结果');

console.log('order-only inventory summary checks ok');
