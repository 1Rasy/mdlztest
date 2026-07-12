# 库存调整 Phase C 当前进度

- 状态：稳定性收口已完成代码、数据库和自动化验证；PR #3 继续保持 Draft，尚未合并
- 最后同步日期：2026-07-12
- PR 分支：`feat/stock-adjustment-phase-c`
- Vercel 测试分支：`stock-adjustment-phase-c`
- 本轮实现提交：以本文所在的 PR head 提交为准
- 本文用途：后续开发者继续工作的唯一进度入口

> 代码、测试和本文在同一次提交中更新。PR 描述与聊天记录只能补充，不能替代本文。

## 1. 本轮实际发现的问题

1. 员工端提交仍先调用 `save_stock_adjustment_request`，再调用 `submit_stock_adjustment_request`。第二次 RPC 失败时会留下草稿、明细和保存历史。
2. `tests/stock-adjustment-database-regression.sql` 只有场景注释，没有执行真实数据库业务链路。
3. 共享核心仍暴露已经被 UI 决策删除的 `missed_receipt / 漏录入库`。
4. 共享核心的数量换算仍接受箱、盒和散数，不符合“只修改整数散数”。
5. 原员工端失败路径虽然不清空商品选择，但没有跨提交面板关闭/重开的失败草稿缓存，原因、说明和备注可能恢复为旧申请值。
6. Vercel 当前部署检查为成功，但连接器对 `sprspr` 项目返回 403，无法取得可交互部署页面；因此不能把部署成功写成实际页面验收通过。

## 2. 本轮完成的修改

### 原子提交

新增 migration：

- `database/20260712_stock_adjustment_atomic_submit.sql`

新增 RPC：

- `save_and_submit_stock_adjustment_request`

该 RPC 在一个 PostgreSQL RPC 事务内：

1. 只接受 `inventory_count`、`damage`、`transfer`、`other`；
2. 校验“其他”必须填写说明；
3. 调用既有 `save_stock_adjustment_request` 新建或更新申请并替换明细；
4. 从保存快照取得申请 ID；
5. 调用既有 `submit_stock_adjustment_request` 更新待审核状态、版本、提交时间和历史；
6. 返回完整申请快照。

函数没有捕获并吞掉异常。保存、明细、状态、版本和历史中的任一步失败，外层 RPC 语句整体回滚。旧 migration 和旧 `save`、`submit` RPC 未修改。

### 前端与共享核心

- `stock-adjustment-api.js` 新增 `saveAndSubmit(...)`，只调用一次 `save_and_submit_stock_adjustment_request`；旧 `save` 和 `submit` 保留。
- `store-stock-adjustment.js` 改为只调用一次 `stockAdjustmentApi.saveAndSubmit(...)`。
- 成功后才关闭提交面板、清空编辑状态并回到库存页。
- 失败时保留商品、方向、数量，并缓存原因、说明和备注；关闭并重新打开提交面板仍可恢复。
- `stock-adjustment-core.js` 原因收敛为盘点差异、破损报废、调货、其他；数量计算只使用整数散数。

## 3. 员工端验收清单

Vercel 检查状态为成功，但实际部署读取受权限阻塞：Vercel API 对项目 `sprspr` 返回 `403 Forbidden`，猜测分支地址也无法生成访问链接。因此本轮没有把 Vercel 部署状态当成功能验收。

以下十项均已通过源码结构、定向静态测试和语法检查；实际 Vercel 交互状态统一为 `BLOCKED（部署访问权限）`：

| 项目 | 静态/源码结果 | Vercel 实际交互 |
|---|---|---|
| 从库存管理页进入时先渲染修改页、无中间页面切换逻辑 | PASS | BLOCKED |
| 修改页只有一个返回按钮，基础返回按钮随后隐藏 | PASS | BLOCKED |
| 申请记录位于商品列表上方，顺序为待审核、已驳回、草稿、历史、已撤回 | PASS | BLOCKED |
| 商品卡片无重复规格口味行 | PASS | BLOCKED |
| 增加在上、减少在下并位于数量左侧 | PASS | BLOCKED |
| 散数接入 1–25、5×5 共 25 个按钮弹窗 | PASS | BLOCKED |
| 当前库存和预计库存左对齐 | PASS | BLOCKED |
| 原因面板仅在点击提交后创建并显示 | PASS | BLOCKED |
| 员工端和共享核心均不存在“漏录入库”选项 | PASS | BLOCKED |
| 关闭提交面板不清空商品、方向、数量；失败后原因/说明/备注也保留 | PASS | BLOCKED |

## 4. 真实数据库业务回归

数据库项目：`wyjbnnqhiehjccmojbbg`。

测试数据使用 `KD2_PHASE_C_TEST_*` 备注和 `KD2_ADMIN` 操作人，全部在未提交外层事务中执行。事务结束后独立查询确认：申请 0、明细 0、历史 0、流水 0。

| 场景 | 结果 | 申请单号 | 商品 | 调整前 | 调整后 | 流水 | 清理结果 |
|---|---|---|---|---:|---:|---:|---|
| 增加库存并审核 | PASS | `SA20260712000006` | `6901668005687` | 0 | 3 | 1 | 回滚，残留 0 |
| 减少库存允许负数 | PASS | `SA20260712000007` | `6901668005687` | 0 | -5 | 1 | 回滚，残留 0 |
| 多商品增减混合 | PASS | `SA20260712000008` | `6901668005687`,`6901668005694` | 0,0 | 4,-2 | 2 | 回滚，残留 0 |
| 驳回后编辑重提 | PASS | `SA20260712000009` | `6901668005694` | 0 | 0 | 0 | 回滚，残留 0 |
| 撤回后编辑重提 | PASS | `SA20260712000010` | `6901668005694` | 0 | 0 | 0 | 回滚，残留 0 |
| 重复提交、同意、驳回 | PASS | `SA20260712000011`,`SA20260712000012` | `6901668005700` | 0 | 1 | 1 | 回滚，残留 0 |
| 任一商品失败整单回滚 | PASS | 未创建 | 有效条码 + `KD2_INVALID_BARCODE` | 未创建 | 未创建 | 0 | 子事务和外层事务均无残留 |
| 负数申请编辑语义 | PASS | `SA20260712000014` | `6901668005700` | 0 | 0 | 0 | 数据库返回 -7，UI 测试恢复为减少 + 7 |
| “其他”必须填写说明 | PASS | 未创建 | `6901668005687` | 未创建 | 未创建 | 0 | 拒绝并无残留 |
| 流水查询命中审核流水 | PASS | `SA20260712000006` | `6901668005687` | 0 | 3 | 1 | 回滚，残留 0 |

可重复执行脚本：`tests/stock-adjustment-database-regression.sql`。

## 5. 自动化测试结果

语法检查：

- `node --check stock-adjustment-api.js`：PASS
- `node --check store-stock-adjustment.js`：PASS
- `node --check store-qty-popup.js`：PASS
- `node --check stock-adjustment-review.js`：PASS
- `node --check inventory-movements-page.js`：PASS

定向 Node 测试：

- `tests/stock-adjustment-api.test.mjs`：5/5
- `tests/stock-adjustment-employee-ui.test.mjs`：16/16
- `tests/stock-adjustment-core.test.mjs`：6/6
- `tests/stock-adjustment-pages.test.mjs`：3/3
- `tests/inventory-movement-export.test.mjs`：3/3
- `tests/utf8-source-guard.test.mjs`：2/2
- `tests/stock-adjustment-migration.test.mjs`：9/9

全量 Node：

- `node --test tests/*.test.mjs`：44/44，失败 0，跳过 0，没有既有失败。

Node 测试属于静态源码契约、语法或本地纯逻辑测试；第 4 节十个场景才是真实 Supabase 数据库业务测试。Vercel 部署成功不计入功能测试数量。

## 6. Supabase 部署与检查

已应用 migration：

- `20260712220104_stock_adjustment_phase_c`
- `20260712220556_stock_adjustment_phase_c_hardening`
- `stock_adjustment_atomic_submit`（本轮）

本轮 migration 使用固定 `search_path = pg_catalog, public`，并显式撤销默认执行权限后仅按现有应用架构授予 `anon, authenticated`。Supabase 安全顾问仍报告仓库既有的公开表/RPC 架构告警；本轮未扩大到认证和 RLS 重构。

## 7. 主要修改文件

- `database/20260712_stock_adjustment_atomic_submit.sql`
- `stock-adjustment-api.js`
- `store-stock-adjustment.js`
- `stock-adjustment-core.js`
- `tests/stock-adjustment-api.test.mjs`
- `tests/stock-adjustment-employee-ui.test.mjs`
- `tests/stock-adjustment-core.test.mjs`
- `tests/stock-adjustment-migration.test.mjs`
- `tests/stock-adjustment-database-regression.sql`
- `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
- `docs/handoff/STOCK-ADJUSTMENT-PHASE-C-HANDOFF.md`
- `docs/superpowers/plans/2026-07-12-stock-adjustment-stabilization.md`

## 8. 剩余事项与完成边界

- 需要具备 `sprspr` Vercel 项目/部署读取权限的人，在实际手机或浏览器中完成第 3 节十项交互验收。
- PR #3 必须继续保持 Draft，不得合并或转为 Ready for review。
- 两个分支必须同步到本文所在同一提交，并在 PR 描述记录实际提交 SHA、测试数量和 Vercel 访问阻塞。
