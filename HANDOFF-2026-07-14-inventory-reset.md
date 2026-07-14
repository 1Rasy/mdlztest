# 2026-07-14 库存清理与 7 月 1 日起算交接

Supabase 项目：`wyjbnnqhiehjccmojbbg`

## 已执行的数据保护

执行任何清理前，已建立独立备份 schema：

```text
backup_inventory_reset_20260714
```

包含：

| 备份表 | 行数 |
|---|---:|
| `sales_orders` | 867 |
| `sales_order_items` | 5,987 |
| `van_stocks` | 1,016 |
| `raw_dealer_outbounds` | 913 |

备份后已核对订单头、订单明细的行数和 ID 汇总，均与原表一致。

## 已执行的库存清理

- `sales_orders`：未删除、未覆盖，仍为 867 行。
- `sales_order_items`：未删除、未覆盖，仍为 5,987 行。
- `van_stocks`：只保留员工 `S260401018`，共 68 行。
- 其他员工的 `van_stocks`：0 行。
- `raw_dealer_outbounds`：只保留映射到 `S260401018` 的行；执行时没有匹配行，因此当前为 0 行。
- `inventory_movements`、库存修改申请和审核历史未清理，它们属于审计历史，不是当前库存余额。

## 新库存口径

固定生效时间：

```text
2026-07-01 00:00:00+08
```

规则：

```text
当前库存 = 2026-07-01 开单前初始库存 - 2026-07-01 及之后订单销量
```

7 月 1 日前订单：

- 保留查看和导出；
- 修改旧订单时保留原 `created_at`；
- 不扣库存；
- 删除订单明细时不恢复库存。

7 月 1 日及之后订单：

- 正常扣库存；
- 删除订单明细时恢复库存；
- 即使商品当前没有 `van_stocks` 行，也会创建负数库存，避免漏算销量。

## 初始库存导入

新增表：

```text
public.van_stock_baselines
```

固定批次：

```text
2026-07-01-opening
```

新增 RPC：

```text
public.import_van_stock_baseline(...)
public.rebuild_van_stocks_from_baseline(...)
```

`stock_summary.html` 已改为调用 RPC，不再直接 `upsert van_stocks`。导入文件中涉及的员工会执行：

1. 替换该员工的 7 月 1 日初始库存基准；
2. 聚合该员工 7 月 1 日及之后的订单销量；
3. 幂等重建当前库存。

重复导入同一份初始库存不会重复扣减订单。

## raw 导入规则

`process_dealer_stock_final()` 和备用重算函数已加入日期判断：

- `bill_date` 早于 2026-07-01：原始单据可以保留，但不增加库存；
- `bill_date` 在 2026-07-01 及之后：按原商品配规增加库存；
- 无法解析日期时使用 `created_at` 作为兜底。

## 已完成验证

使用数据库子事务进行了自动回滚测试：

- 初始库存 100 减去 7 月 1 日后销量，重算结果准确；
- 删除 7 月前订单明细，库存不变；
- 删除 7 月后订单明细，库存恢复对应数量；
- 验证结束后测试变更全部回滚，正式订单未被改动。

## 恢复入口

完整备份位于：

```sql
backup_inventory_reset_20260714.sales_orders
backup_inventory_reset_20260714.sales_order_items
backup_inventory_reset_20260714.van_stocks
backup_inventory_reset_20260714.raw_dealer_outbounds
```

订单原表当前仍完整，因此不需要执行恢复。任何恢复操作前，应先对当前表再次快照，避免覆盖 2026-07-14 之后新增的数据。
