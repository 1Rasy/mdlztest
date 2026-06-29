import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const store = readFileSync(join(root, 'store.html'), 'utf8');
const dashboard = readFileSync(join(root, 'dashboard.html'), 'utf8');

assert.ok(store.includes('async function deleteNewStore'), 'store should implement new store deletion');
assert.ok(store.includes(".from('employee_store_assets').delete()"), 'new store deletion should remove the manual store asset row');
assert.ok(store.includes('event.stopPropagation(); deleteNewStore'), 'manual store delete button should not open store history');
assert.ok(store.includes(".from('sales_orders').select('id',{count:'exact',head:true})"), 'delete flow should warn when manual store has order history');

assert.ok(dashboard.includes('const normalRows='), 'dashboard export should split regular store rows');
assert.ok(dashboard.includes('offlineRows=rows.filter'), 'dashboard export should split manual store rows');
assert.ok(dashboard.includes("String(r.atom||'').startsWith('NEW_')"), 'dashboard export should identify manual stores by NEW_ atom code');
assert.ok(dashboard.includes("XLSX.utils.book_append_sheet(wb,offlineWs,'线外门店')"), 'dashboard export should append sheet2 named 线外门店');