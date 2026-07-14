# 2026-07-14 库存清理与 7 月 1 日起算交接

Supabase 项目：`wyjbnnqhiehjccmojbbg`

## 已执行的数据保护

### 清理前快照

执行任何清理前，已建立独立备份 schema：

```text
backup_inventory_reset_20260714
```

| 备份表 | 行数 |
|---|---:|
| `sales_orders` | 867 |
| `sales_order_items` | 5,987 |
| `van_stocks` | 1,016 |
| `raw_dealer_outbounds` | 913 |

备份后已核对订单头、订单明细的行数和 ID 汇总，均与原表一致。

### 执行结束快照

清理和验证期间，线上正常新增了一张订单，因此又建立最终全量备份：

```text
backup_inventory_reset_final_20260714
```

| 备份表 | 行数 |
|---|---:|
| `sales_orders` | 868 |
| `sales_order_items` | 5,989 |
| `van_stocks` | 70 |
| `raw_dealer_outbounds` | 0 |

最终备份与当前订单表行数及 ID 汇总再次校验一致。

## 已执行的库存清理

清理时点的结果：

- `sales_orders`、`sales_order_items` 未参与删除或覆盖；
- `van_stocks` 的旧库存只保留员工 `S260401018`，共 68 行；
- 其他员工的旧 `van_stocks` 全部清除；
- `raw_dealer_outbounds` 中没有映射到 `S260401018` 的行，因此旧 raw 库存源清为 0；
- `inventory_movements`、库存修改申请和审核历史未清理，它们属于审计历史，不是当前库存余额。

清理完成后，线上新增订单：

```text
订单号：SO1784002919813966
员工：S230721003
门店：陆帆百货
时间：2026-07-14 12:22:00+08
```

该订单正常生成两条库存扣减，合计 `-10`。这两条不是遗留旧库存，而是清理后发生的新业务，因此按“7 月 1 日后订单参与库存”的规则保留。当前 `van_stocks` 共 70 行：

- `S260401018`：68 行；
- 新订单产生的有效扣减：2 行。

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

另外已完成：

- 新基准表启用 RLS；
- 新增及修改的库存函数固定 `search_path`；
- 禁止客户端直接调用备用 raw 重算触发器函数；
- 为基准重算和订单聚合增加相关索引。

## 恢复入口

清理前备份：

```sql
backup_inventory_reset_20260714.sales_orders
backup_inventory_reset_20260714.sales_order_items
backup_inventory_reset_20260714.van_stocks
backup_inventory_reset_20260714.raw_dealer_outbounds
```

执行结束后的最终备份：

```sql
backup_inventory_reset_final_20260714.sales_orders
backup_inventory_reset_final_20260714.sales_order_items
backup_inventory_reset_final_20260714.van_stocks
backup_inventory_reset_final_20260714.raw_dealer_outbounds
```

订单原表当前仍完整，因此不需要执行恢复。任何恢复操作前，应先对当前表再次快照，避免覆盖后续新增业务数据。
