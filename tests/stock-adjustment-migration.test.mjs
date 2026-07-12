import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../database/20260712_stock_adjustment_phase_c.sql', import.meta.url), 'utf8');
const compact = sql.replace(/\s+/g, ' ').toLowerCase();

test('creates the request, history, item and unified movement tables', () => {
  for (const table of ['stock_adjustment_requests', 'stock_adjustment_request_items', 'stock_adjustment_request_history', 'inventory_movements']) {
    assert.match(compact, new RegExp(`create table(?: if not exists)? public\\.${table}`));
  }
  assert.match(compact, /adjustment_qty[^,]+check\s*\(adjustment_qty <> 0\)/);
  assert.match(compact, /unique \(request_id, product_barcode\)/);
});

test('enforces one pending request per employee and immutable idempotent movements', () => {
  assert.match(compact, /create unique index[^;]+employee_code[^;]+where status = 'pending_review'/);
  assert.match(compact, /idempotency_key[^,]+unique/);
  assert.match(compact, /before update or delete on public\.inventory_movements/);
});

test('provides all RPCs with safe definer settings and explicit grants', () => {
  for (const fn of [
    'save_stock_adjustment_request', 'submit_stock_adjustment_request', 'withdraw_stock_adjustment_request',
    'reject_stock_adjustment_request', 'approve_stock_adjustment_request', 'get_my_stock_adjustment_requests',
    'get_pending_stock_adjustment_requests', 'get_inventory_movement_details'
  ]) assert.match(compact, new RegExp(`function public\\.${fn}\\(`));
  assert.match(compact, /security definer set search_path = pg_catalog, public/);
  assert.match(compact, /revoke all on[^;]+from anon, authenticated/);
  assert.match(compact, /grant execute on function[^;]+to anon, authenticated/);
});

test('approval locks current stock and writes inventory plus ledger in one function', () => {
  const start = compact.indexOf('function public.approve_stock_adjustment_request(');
  const end = compact.indexOf('function public.get_my_stock_adjustment_requests(', start);
  const approval = compact.slice(start, end);
  assert.match(approval, /for update/);
  assert.match(approval, /insert into public\.van_stocks/);
  assert.match(approval, /update public\.van_stocks/);
  assert.match(approval, /insert into public\.inventory_movements/);
  assert.match(approval, /quantity_before/);
  assert.match(approval, /quantity_after/);
  assert.match(approval, /status = 'approved'/);
});

test('movement query uses Shanghai inclusive end-date semantics', () => {
  assert.match(compact, /at time zone 'asia\/shanghai'/);
  assert.match(compact, /p_end_date \+ 1/);
  assert.match(compact, /m\.occurred_at < v_end_exclusive/);
});

