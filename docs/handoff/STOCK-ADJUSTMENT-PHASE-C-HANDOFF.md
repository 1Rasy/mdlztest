# 库存调整 Phase C 接手文档

- 当前阶段：测试与稳定性收口
- PR：`#3 feat: add stock adjustment phase C`
- PR 分支：`feat/stock-adjustment-phase-c`
- Vercel 测试分支：`stock-adjustment-phase-c`
- 合并状态：保持 Draft，未经用户确认不得合并
- 进度主文档：`docs/status/STOCK-ADJUSTMENT-PHASE-C.md`

## 1. 接手前必须阅读

按顺序读取：

1. `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`
2. `docs/decisions/STOCK-ADJUSTMENT-UI-002.md`
3. `docs/decisions/BRANCH-TEST-FILES-001.md`
4. `docs/decisions/IMPLEMENTATION-STATUS-SYNC-001.md`
5. `docs/superpowers/plans/2026-07-12-stock-adjustment-stabilization.md`
6. PR #3 最新描述、最新提交和最新评论

不要根据旧审查评论恢复已经被用户否定的界面。当前确认后的员工端规则以状态文档和 UI 决策文档为准。

## 2. 已完成状态

### 员工端

- 入口位于库存管理页。
- 进入库存修改页时不应先显示库存管理页跳动。
- 修改页只保留一个返回按钮。
- 商品卡片不重复显示规格口味行。
- 增加、减少按钮上下排列在数量左侧。
- 散数使用开单页相同的 1–25、5×5 数量弹窗。
- 当前库存和预计库存左对齐。
- 待审核、已驳回、草稿、历史和已撤回记录置于页面顶部并分区展示。
- 点击提交后才选择修改原因。
- 原因保留盘点差异、破损报废、调货、其他。

### 管理端和数据库

- 管理端审核页已接入统一库存调整 API。
- 库存流水页已接入统一 API。
- 库存调整表、历史表、明细表、库存流水表和相关 RPC 已部署。
- 保存、提交、审核通过、库存变化、流水和历史已做自动回滚事务冒烟测试。

## 3. 下一阶段唯一目标

不要继续扩展新功能。下一阶段只做：

> 验收现有流程，修复稳定性问题，并形成可重复执行的端到端回归测试。

优先级顺序不能颠倒。

## 4. 下一步工作顺序

### P0：实际页面验收

在 Vercel 测试分支上完成员工端和管理端实际操作，至少检查：

1. 从库存管理页点击“申请修改库存”，页面直接进入修改模式，无明显上跳或中间态。
2. 页面只显示一个返回入口。
3. 申请记录位于商品筛选和商品列表上方，分组顺序正确。
4. 商品卡片不显示被删除的规格口味行。
5. 增加、减少上下排列在数量左侧。
6. 点击散数后出现 25 个数字按钮的 5×5 弹窗。
7. 当前库存和预计库存文字左对齐。
8. 点击提交后才出现原因面板。
9. 原因中不存在“漏录入库”。
10. 关闭提交面板后，已选商品和数量不丢失。

发现问题时先写失败测试或明确复现步骤，再修改代码。

### P1：提交原子性

当前员工端仍是先保存申请，再提交审核。如果两个请求之间失败，可能留下草稿。

下一轮应新增一个原子 RPC，例如：

```text
save_and_submit_stock_adjustment_request
```

要求一个数据库事务内完成：

- 新建或更新申请；
- 替换申请明细；
- 校验原因和整数数量；
- 将状态改为待审核；
- 增加版本；
- 写入历史；
- 返回完整申请快照。

任何一步失败时整单回滚，不留下半完成草稿。

必须使用新的 migration 文件，不要修改已经部署过的 migration。

建议文件：

- 新建：`database/20260712_stock_adjustment_atomic_submit.sql`
- 修改：`stock-adjustment-api.js`
- 修改：`store-stock-adjustment.js`
- 修改：`tests/stock-adjustment-api.test.mjs`
- 修改：`tests/stock-adjustment-database-regression.sql`

前端提交成功后再清空表单；失败时保留当前选择。

### P1：真实业务链路回归

至少完整验证以下场景：

1. 增加库存：员工提交 → 管理员通过 → 库存增加 → 生成一条流水。
2. 减少库存：员工提交负数 → 管理员通过 → 库存减少，允许结果为负数。
3. 多商品：同一申请包含增加和减少，全部成功后库存和流水均正确。
4. 驳回：驳回不改变库存；员工编辑后方向、数量、原因和备注恢复正确；重新提交成功。
5. 撤回：待审核申请撤回后可编辑重提，库存不变。
6. 重复点击：提交、通过、驳回不能产生重复结果。
7. 失败回滚：任一明细失败时，申请状态、库存和流水不能只完成一部分。
8. 编辑负数：数据库中的负数必须恢复成“减少 + 绝对值散数”。
9. 原因面板：只在提交时出现；“其他”必须填写说明。
10. 库存流水：能按时间和员工查询到审核通过产生的流水。

测试数据必须明确标记，并在测试结束后删除或通过事务回滚。

### P2：完整测试收口

在新的干净 checkout 上运行：

```bash
node --check stock-adjustment-api.js
node --check store-stock-adjustment.js
node --check store-qty-popup.js
node --check stock-adjustment-review.js
node --check inventory-movements-page.js
node --test tests/stock-adjustment-api.test.mjs
node --test tests/stock-adjustment-employee-ui.test.mjs
node --test tests/stock-adjustment-core.test.mjs
node --test tests/stock-adjustment-pages.test.mjs
node --test tests/inventory-movement-export.test.mjs
node --test tests/utf8-source-guard.test.mjs
node --test tests/*.test.mjs
```

必须报告真实的：

- 命令；
- 通过数量；
- 失败数量；
- 是否存在既有失败；
- 哪些验证是静态测试，哪些是真实数据库流程。

不要用 Vercel 部署成功代替 JavaScript 或业务流程测试。

## 5. 禁止事项

- 不合并 PR。
- 不把 PR 转为 Ready for review，除非用户明确要求。
- 不增加箱、盒、整件或价格输入。
- 不恢复开单首页顶层库存调整入口。
- 不恢复普通数字输入框或方向下拉框。
- 不新增“漏录入库”原因。
- 不扩展销售、售后、ERP 或其他库存来源。
- 不只更新 PR 评论而遗漏仓库内 `docs`。
- 不修改已应用 migration 的历史内容；数据库变化使用新 migration。

## 6. 每轮交付要求

每轮完成后必须同时完成：

1. 修改代码；
2. 增加或更新测试；
3. 更新 `docs/status/STOCK-ADJUSTMENT-PHASE-C.md`；
4. 必要时更新本文；
5. 推送 PR 分支；
6. 将 `stock-adjustment-phase-c` 同步到相同提交；
7. 确认两个分支 `ahead_by=0`、`behind_by=0`；
8. 更新 PR 描述中的最新提交和真实测试结果。

源码、`tests/` 和 `docs/` 必须位于同一提交。

## 7. 完成定义

只有满足以下条件，才可以向用户报告“稳定性阶段完成”：

- 实际页面验收清单全部通过；
- 原子提交已实现并验证失败回滚；
- 增加、减少、驳回重提、撤回重提、多商品和库存流水完整通过；
- 定向测试和全量 Node 测试结果已记录；
- 状态文档、接手文档、PR 描述和两个分支保持一致；
- 用户实际测试后没有新的阻塞问题。
