# Stock Adjustment Stabilization Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` and complete tasks in order.

**Goal:** Finish Phase C stabilization by validating the current UI, replacing two-step submission with one atomic RPC, executing end-to-end business regression, and synchronizing code, tests, and docs.

**Architecture:** Keep the current static HTML and shared API structure. Add a new migration containing an atomic save-and-submit RPC that wraps the existing save and submit functions in one database transaction. Expose it through `StockAdjustmentApi`, switch the employee page to one request, then verify the whole employee-to-admin-to-inventory-to-movement flow.

**Tech Stack:** Vanilla JavaScript, Supabase JS v2, PostgreSQL, Node.js built-in test runner, Vercel preview.

## Global Constraints

- Keep PR #3 as Draft and do not merge without explicit user approval.
- Do not add unrelated product features.
- Employee adjustments remain loose-piece integers only.
- Do not restore case, box, whole, price, numeric-input, direction-select, top-level order-page entry, or the “漏录入库” reason.
- Use a new migration file; do not edit migrations that have already been applied.
- Every implementation push must also update `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`.
- The PR branch and Vercel branch must end on the same commit containing source, tests, and docs.

---

## Task 1: Verify the current preview before changing code

**Files:**
- Modify: `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
- Modify: `docs/handoff/STOCK-ADJUSTMENT-PHASE-C-HANDOFF.md`
- Test when needed: `tests/stock-adjustment-employee-ui.test.mjs`

- [ ] Confirm `feat/stock-adjustment-phase-c` and `stock-adjustment-phase-c` are identical.
- [ ] Confirm Vercel is testing the same commit.
- [ ] Execute the ten-item employee-page checklist in the handoff document.
- [ ] Record each item as PASS or FAIL.
- [ ] For every reproducible failure, add a focused regression test before fixing production code.
- [ ] Run:

```bash
node --test tests/stock-adjustment-employee-ui.test.mjs
node --check store-stock-adjustment.js
node --check store-qty-popup.js
```

- [ ] Commit any fixes with their tests and docs.

Expected deliverable: the existing UI is either verified or every remaining defect has a test and a fix.

---

## Task 2: Add atomic save-and-submit database support

**Files:**
- Create: `database/20260712_stock_adjustment_atomic_submit.sql`
- Modify: `tests/stock-adjustment-migration.test.mjs`
- Modify: `tests/stock-adjustment-database-regression.sql`

**Required interface:**

```text
save_and_submit_stock_adjustment_request(
  request_id,
  employee_code,
  reason_code,
  reason_note,
  remark,
  items
) -> complete request snapshot
```

- [ ] Add a failing migration test proving the new migration and RPC are absent.
- [ ] Create the migration without changing earlier migration files.
- [ ] Implement the RPC so save and submit occur inside one outer transaction.
- [ ] Ensure a submit failure rolls back the save, item replacement, version change, and history writes.
- [ ] Add a database regression proving a second pending request cannot leave a new draft or extra history after failure.
- [ ] Apply the migration through the existing Supabase migration workflow.
- [ ] Execute the regression in a transaction and confirm no test data remains.

Run:

```bash
node --test tests/stock-adjustment-migration.test.mjs
```

Expected database evidence:

```text
success path: PASS
submit failure rolls back save: PASS
no draft residue: PASS
no test data residue: PASS
```

---

## Task 3: Add the atomic method to the shared API

**Files:**
- Modify: `stock-adjustment-api.js`
- Modify: `tests/stock-adjustment-api.test.mjs`

**Required interface:**

```text
StockAdjustmentApi.create(client).saveAndSubmit(
  id,
  employee,
  reason,
  note,
  remark,
  items
)
```

- [ ] Write a failing API test that expects exactly one RPC call named `save_and_submit_stock_adjustment_request`.
- [ ] Implement `saveAndSubmit` using the same argument mapping currently used by `save`.
- [ ] Keep the old `save` and `submit` methods temporarily for compatibility.
- [ ] Confirm ordinary Supabase errors remain readable.

Run:

```bash
node --test tests/stock-adjustment-api.test.mjs
node --check stock-adjustment-api.js
```

Expected: all tests pass and `saveAndSubmit` makes one RPC call.

---

## Task 4: Switch the employee page to atomic submission

**Files:**
- Modify: `store-stock-adjustment.js`
- Modify: `tests/stock-adjustment-employee-ui.test.mjs`

- [ ] Add a failing test proving the employee submit function still calls `save` and `submit` separately.
- [ ] Replace those two calls with one `stockAdjustmentApi.saveAndSubmit(...)` call.
- [ ] Keep the submit button disabled during the request.
- [ ] On success, clear the draft, close the submission panel, return to inventory view, and refresh records.
- [ ] On failure, restore the button and preserve products, directions, quantities, reason, note, and remark.
- [ ] Ensure editing an existing rejected or withdrawn request passes its existing request ID.

Run:

```bash
node --test tests/stock-adjustment-employee-ui.test.mjs
node --check store-stock-adjustment.js
```

Expected: the submit function contains one atomic API call and no sequential save/submit calls.

---

## Task 5: Execute end-to-end business regression

**Files:**
- Modify: `tests/stock-adjustment-database-regression.sql`
- Modify: `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
- Modify: `docs/handoff/STOCK-ADJUSTMENT-PHASE-C-HANDOFF.md`

Verify these scenarios with marked test data and cleanup or transaction rollback:

1. Increase request → approval → inventory increases → one movement.
2. Decrease request → approval → inventory decreases and may become negative.
3. Multi-product request containing both positive and negative items.
4. Rejection leaves inventory unchanged; edit and resubmit preserves direction, quantity, reason, and remark.
5. Withdrawal leaves inventory unchanged; edit and resubmit succeeds.
6. Duplicate submit, approve, and reject actions do not create duplicate state changes or movements.
7. One item failure rolls back the whole request, inventory, history, and movements.
8. A stored negative quantity reopens as “减少 + absolute loose quantity”.
9. The reason panel appears only at submit time and requires a note for “其他”.
10. The movement page can find the approved adjustment by date and employee.

For every scenario record:

```text
scenario:
PASS/FAIL:
request number:
products:
before quantities:
after quantities:
movement count:
cleanup or rollback result:
```

Expected: all scenarios pass and no test residue remains.

---

## Task 6: Final verification and synchronization

**Files:**
- Modify: `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
- Modify: `docs/handoff/STOCK-ADJUSTMENT-PHASE-C-HANDOFF.md` when scope changes
- Update: PR #3 description

Run syntax checks:

```bash
node --check stock-adjustment-api.js
node --check store-stock-adjustment.js
node --check store-qty-popup.js
node --check stock-adjustment-review.js
node --check inventory-movements-page.js
```

Run targeted tests:

```bash
node --test tests/stock-adjustment-api.test.mjs
node --test tests/stock-adjustment-employee-ui.test.mjs
node --test tests/stock-adjustment-core.test.mjs
node --test tests/stock-adjustment-pages.test.mjs
node --test tests/inventory-movement-export.test.mjs
node --test tests/utf8-source-guard.test.mjs
```

Run the full Node suite:

```bash
node --test tests/*.test.mjs
```

- [ ] Record exact pass and fail counts.
- [ ] Distinguish static tests from real database flow tests.
- [ ] Push the verified commit to `feat/stock-adjustment-phase-c`.
- [ ] Move `stock-adjustment-phase-c` to the same commit.
- [ ] Confirm comparison result is `identical`, `ahead_by=0`, `behind_by=0`.
- [ ] Update docs and PR description in the same delivery.
- [ ] Keep the PR as Draft.

## Completion Definition

The stabilization phase is complete only when:

- the preview acceptance checklist passes;
- atomic submission and failure rollback are verified;
- increase, decrease, rejection, withdrawal, resubmission, multi-product, and movement scenarios pass;
- targeted and full Node results are recorded;
- source, tests, docs, PR description, and both branches agree;
- the user completes actual testing without a new blocking defect.
