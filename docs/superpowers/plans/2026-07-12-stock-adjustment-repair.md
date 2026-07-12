# Stock Adjustment Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore valid UTF-8 stock-adjustment sources, fix Supabase API injection, and deliver the confirmed employee adjustment interaction without modifying production Supabase.

**Architecture:** Keep the existing static HTML and classic-script structure. Inject each page's existing Supabase client into one shared `StockAdjustmentApi.create(client)` service, keep employee adjustment state in `store-stock-adjustment.js`, and update only the affected product row and summary during quantity changes.

**Tech Stack:** Vanilla JavaScript, Supabase JS v2, Node.js built-in test runner.

## Global Constraints

- Do not merge PR #3.
- Do not apply the database migration to production Supabase.
- Employee adjustment accepts only loose-piece integer quantities.
- The Vercel branch `stock-adjustment-phase-c` must contain the complete `tests/` directory.

---

### Task 1: Restore UTF-8 source integrity

**Files:**
- Modify: `stock-adjustment-api.js`
- Modify: `store-stock-adjustment.js`
- Modify: `stock-adjustment-review.js`
- Modify: `inventory-movements-page.js`
- Create: `tests/utf8-source-guard.test.mjs`

- [x] Write a failing test that rejects known mojibake and runs `node --check` on all four scripts.
- [x] Verify the test fails against the corrupted source.
- [x] Restore clean UTF-8 source from the last clean commit.
- [x] Verify the guard passes.

### Task 2: Inject Supabase client into the shared API

**Files:**
- Modify: `stock-adjustment-api.js`
- Create: `tests/stock-adjustment-api.test.mjs`

- [x] Write failing tests for `create(client)`, every RPC mapping, missing-migration messages, and ordinary errors.
- [x] Implement `StockAdjustmentApi.create(client)` without `window.client`.
- [x] Verify all API tests pass.

### Task 3: Rebuild employee stock-adjustment interaction

**Files:**
- Modify: `store-stock-adjustment.js`
- Modify: `tests/stock-adjustment-employee-ui.test.mjs`

- [x] Write failing tests for direct increase/decrease buttons, order-page loose picker reuse, local row updates, and negative-request restoration.
- [x] Implement direct direction buttons and `makeQtyOptions(100,row.qty)`.
- [x] Keep brand/spec switches limited to the product area and item changes limited to the row and summary.
- [x] Verify employee UI tests pass.

### Task 4: Repair review and movement pages

**Files:**
- Modify: `stock-adjustment-review.js`
- Modify: `inventory-movements-page.js`
- Modify: `tests/stock-adjustment-pages.test.mjs`

- [x] Write failing tests for client injection, duplicate-action protection, and readable Chinese messages.
- [x] Implement the shared API service on both pages.
- [x] Verify page tests pass.

### Task 5: Verify and publish both branches

**Files:**
- All files above.

- [x] Run all targeted Node tests.
- [x] Run fresh `node --check` for all modified JavaScript files and test files.
- [x] Commit atomically to `feat/stock-adjustment-phase-c`.
- [x] Create or update `stock-adjustment-phase-c` to the same verified commit so Vercel receives the complete `tests/` directory.
- [x] Update PR #3 description and add a review summary without merging.
