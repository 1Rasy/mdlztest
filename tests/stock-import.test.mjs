import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('stock_summary.html', 'utf8');

assert.match(html, /2026-07-01/, '库存页应说明7月1日起算时间');
assert.match(html, /S260401018/, '库存页应说明唯一保留原库存的员工');
assert.match(html, /保留清理前的68条原库存/, '页面应说明保留68条原库存');
assert.match(html, /其他员工以零库存起算/, '页面应说明其他员工零库存起算');
assert.match(html, /7月1日前订单仅作历史查看/, '页面应说明旧订单只作历史查看');
assert.match(html, /经销商原始出库导入不参与库存/, '页面应说明raw导入不参与库存');
assert.match(html, /INVENTORY_CUTOFF = '2026-07-01T00:00:00\+08:00'/, '应固定中国时区7月1日起算时间');
assert.doesNotMatch(html, /openImportFile\(/, '库存汇总页不应提供初始库存导入');
assert.doesNotMatch(html, /id="stockImportFile"/, '库存汇总页不应保留库存Excel输入');
assert.doesNotMatch(html, /from\('van_stocks'\)\.upsert/, '页面不应直接覆盖库存');
assert.match(html, /onclick="exportEmployeeStocks\(\)"/, '库存页应保留导出功能');
assert.match(html, /client\.from\('van_stocks'\)/, '库存页应读取数据库库存结果');

console.log('preserved opening inventory summary checks ok');
