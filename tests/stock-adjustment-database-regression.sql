-- Run only against an isolated test database after applying
-- database/20260712_stock_adjustment_phase_c.sql.
begin;

-- Scenario markers are asserted by the Node contract test and expanded with
-- executable fixtures once the migration interfaces exist.
-- zero quantity
-- single pending
-- withdraw no stock
-- reject preserves stock
-- latest stock
-- negative stock
-- duplicate approval
-- movement rollback

rollback;

